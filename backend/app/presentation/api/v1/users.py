from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from app.core.database import get_db
from app.presentation.dependencies.auth import get_current_user_payload, require_admin
from app.application.schemas.user import (
    UserCreate, UserUpdate, UserResponse,
    ChangePasswordRequest, AdminChangePasswordRequest,
)
from app.infrastructure.repositories.user_repository import UserRepository
from app.infrastructure.repositories.audit_repository import AuditRepository
from app.core.security import hash_password, verify_password
from app.application.services.upload_service import UploadService
from app.domain.models.user import UserRole

router = APIRouter(prefix="/users", tags=["Usuários"])


# ─── List (admin only, paginated) ─────────────────────────────────────────────
@router.get("", response_model=dict)
async def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    search: str = Query("", max_length=100),
    ativo: Optional[bool] = Query(None),
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(require_admin),
):
    """List users with search and pagination. ADMIN only."""
    repo = UserRepository(db)
    users, total = await repo.list_paginated(skip=skip, limit=limit, search=search, ativo=ativo)
    return {
        "items": [_serialize(u) for u in users],
        "total": total,
        "skip": skip,
        "limit": limit,
    }


# ─── Create (admin only) ──────────────────────────────────────────────────────
@router.post("", response_model=UserResponse, status_code=201)
async def create_user(
    body: UserCreate,
    db: AsyncSession = Depends(get_db),
    admin: dict = Depends(require_admin),
):
    """Create user. ADMIN only. Validates unique email and unique username."""
    repo = UserRepository(db)

    # Duplicate email check
    if await repo.email_exists(body.email):
        raise HTTPException(status_code=409, detail="E-mail já cadastrado")

    # Duplicate username check
    if body.usuario and await repo.username_exists(body.usuario):
        raise HTTPException(status_code=409, detail="Nome de usuário já em uso")

    senha_hash = hash_password(body.senha)
    data = body.model_dump(exclude={"senha"})
    user = await repo.create(**data, senha_hash=senha_hash)

    # Audit
    audit = AuditRepository(db)
    await audit.log(
        usuario_id=admin["sub"],
        acao="CREATE",
        entidade="users",
        entidade_id=user.id,
        dados_depois={"nome": user.nome, "email": user.email, "role": user.role.value},
        descricao=f"Funcionário criado: {user.nome}",
    )
    return user


# ─── Get current user (any authenticated) ────────────────────────────────────
@router.get("/me", response_model=UserResponse)
async def get_me(
    db: AsyncSession = Depends(get_db),
    payload: dict = Depends(get_current_user_payload),
):
    repo = UserRepository(db)
    user = await repo.get_by_id(payload["sub"])
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    return user


# ─── Get specific user (admin only) ──────────────────────────────────────────
@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(require_admin),
):
    repo = UserRepository(db)
    user = await repo.get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    return user


# ─── Update (admin only) ──────────────────────────────────────────────────────
@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str,
    body: UserUpdate,
    db: AsyncSession = Depends(get_db),
    admin: dict = Depends(require_admin),
):
    """Update user profile. ADMIN only. Role changes are NOT allowed via this endpoint."""
    repo = UserRepository(db)
    user = await repo.get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")

    # Check username uniqueness on update
    if body.usuario and await repo.username_exists(body.usuario, exclude_id=user_id):
        raise HTTPException(status_code=409, detail="Nome de usuário já em uso")

    dados_antes = {"nome": user.nome, "ativo": user.ativo, "usuario": user.usuario, "cargo": user.cargo}
    mudancas = body.model_dump(exclude_unset=True)
    if mudancas.get("ativo") is False and user.ativo:
        if user.id == admin["sub"]:
            raise HTTPException(status_code=400, detail="Você não pode desativar o próprio usuário.")
        mudancas["sessao_versao"] = (user.sessao_versao or 0) + 1  # desativado sai na hora
    updated = await repo.update(user, **mudancas)

    # Audit
    audit = AuditRepository(db)
    await audit.log(
        usuario_id=admin["sub"],
        acao="UPDATE",
        entidade="users",
        entidade_id=user_id,
        dados_antes=dados_antes,
        dados_depois=body.model_dump(exclude_unset=True, mode="json"),
        descricao=f"Perfil atualizado: {user.nome}",
    )
    return updated


# ─── Change role (admin only, explicit endpoint) ───────────────────────────────
@router.patch("/{user_id}/role", response_model=UserResponse)
async def change_role(
    user_id: str,
    role: UserRole,
    db: AsyncSession = Depends(get_db),
    admin: dict = Depends(require_admin),
):
    """Change a user's role. ADMIN only. Cannot demote yourself."""
    if user_id == admin["sub"]:
        raise HTTPException(status_code=400, detail="Você não pode alterar sua própria role.")
    repo = UserRepository(db)
    user = await repo.get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    dados_antes = {"role": user.role.value}
    updated = await repo.update(user, role=role, sessao_versao=(user.sessao_versao or 0) + 1)
    audit = AuditRepository(db)
    await audit.log(
        usuario_id=admin["sub"],
        acao="ROLE_CHANGE",
        entidade="users",
        entidade_id=user_id,
        dados_antes=dados_antes,
        dados_depois={"role": role.value},
        descricao=f"Role alterada para {role.value}: {user.nome}",
    )
    return updated


# ─── User changes own password ────────────────────────────────────────────────
@router.post("/me/change-password", status_code=204)
async def change_my_password(
    body: ChangePasswordRequest,
    db: AsyncSession = Depends(get_db),
    payload: dict = Depends(get_current_user_payload),
):
    """Authenticated user changes their own password. Requires current password."""
    repo = UserRepository(db)
    user = await repo.get_by_id(payload["sub"])
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")

    if not verify_password(body.senha_atual, user.senha_hash):
        # 400 e não 401: 401 faria o painel achar que a sessão caiu e deslogar
        raise HTTPException(status_code=400, detail="Senha atual incorreta")

    new_hash = hash_password(body.nova_senha)
    # Derruba as outras sessões (outro navegador, celular perdido). O painel pede login de novo.
    await repo.update(user, senha_hash=new_hash, sessao_versao=(user.sessao_versao or 0) + 1)

    audit = AuditRepository(db)
    await audit.log(
        usuario_id=payload["sub"],
        acao="PASSWORD_CHANGE",
        entidade="users",
        entidade_id=payload["sub"],
        descricao="Usuário alterou a própria senha",
    )


# ─── Admin changes any user's password ───────────────────────────────────────
@router.post("/{user_id}/change-password", status_code=204)
async def admin_change_password(
    user_id: str,
    body: AdminChangePasswordRequest,
    db: AsyncSession = Depends(get_db),
    admin: dict = Depends(require_admin),
):
    """Admin sets a new password for any user. No current password required."""
    repo = UserRepository(db)
    user = await repo.get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")

    new_hash = hash_password(body.nova_senha)
    await repo.update(user, senha_hash=new_hash, sessao_versao=(user.sessao_versao or 0) + 1)

    audit = AuditRepository(db)
    await audit.log(
        usuario_id=admin["sub"],
        acao="PASSWORD_CHANGE",
        entidade="users",
        entidade_id=user_id,
        descricao=f"Senha alterada pelo administrador para: {user.nome}",
    )


# ─── Upload avatar (admin for any user, user for self) ────────────────────────
@router.post("/{user_id}/avatar", response_model=UserResponse)
async def upload_avatar(
    user_id: str,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    payload: dict = Depends(get_current_user_payload),
):
    """
    Upload/replace avatar. Admin can upload for any user. Users can only upload their own.
    """
    is_admin = payload.get("role") == "admin"
    is_self  = payload["sub"] == user_id

    if not is_admin and not is_self:
        raise HTTPException(status_code=403, detail="Sem permissão para alterar este avatar.")

    repo = UserRepository(db)
    user = await repo.get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")

    foto_path = await UploadService.save_avatar(file, old_foto=user.foto)
    updated = await repo.update(user, foto=foto_path)
    return updated


# ─── Delete avatar (admin only) ───────────────────────────────────────────────
@router.delete("/{user_id}/avatar", response_model=UserResponse)
async def delete_avatar(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    _user: dict = Depends(require_admin),
):
    repo = UserRepository(db)
    user = await repo.get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    if user.foto:
        UploadService.delete_avatar(user.foto)
    return await repo.update(user, foto=None)


# ─── Soft delete (admin only) ─────────────────────────────────────────────────
@router.delete("/{user_id}", status_code=204)
async def delete_user(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    admin: dict = Depends(require_admin),
):
    repo = UserRepository(db)
    target = await repo.get_by_id(user_id)
    if not target:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    if target.id == admin["sub"]:
        raise HTTPException(status_code=400, detail="Você não pode excluir seu próprio usuário.")
    if target.role == UserRole.ADMIN:
        raise HTTPException(status_code=400, detail="Não é possível excluir outro administrador.")

    # Remove avatar file before soft delete
    if target.foto:
        UploadService.delete_avatar(target.foto)

    # Free email and username so they can be reused after deletion
    freed_email   = f"{target.email}__deleted_{user_id[:8]}"
    freed_usuario = f"{target.usuario}__deleted_{user_id[:8]}" if target.usuario else None
    await repo.update(target, email=freed_email, usuario=freed_usuario,
                      sessao_versao=(target.sessao_versao or 0) + 1)

    await repo.soft_delete(target, deleted_by=admin["sub"])

    audit = AuditRepository(db)
    await audit.log(
        usuario_id=admin["sub"],
        acao="DELETE",
        entidade="users",
        entidade_id=user_id,
        descricao=f"Funcionário excluído: {target.nome}",
    )


# ─── Helpers ──────────────────────────────────────────────────────────────────
def _serialize(user) -> dict:
    return {
        "id":                user.id,
        "nome":              user.nome,
        "email":             user.email,
        "usuario":           user.usuario,
        "telefone":          user.telefone,
        "foto":              UploadService.get_url(user.foto),
        "role":              user.role.value,
        "ativo":             user.ativo,
        "cargo":             user.cargo,
        "data_contratacao":  user.data_contratacao.isoformat() if user.data_contratacao else None,
        "ultimo_login":      user.ultimo_login.isoformat() if user.ultimo_login else None,
        "created_at":        user.created_at.isoformat(),
    }
