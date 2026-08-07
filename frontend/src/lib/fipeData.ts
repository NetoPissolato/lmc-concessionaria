/**
 * Lista estática de marcas e modelos brasileiros baseada na tabela FIPE.
 * Funciona offline, sem dependência de APIs externas.
 *
 * IMPORTANTE: Marcas como Honda, BMW e Suzuki existem nos dois segmentos
 * com modelos diferentes. Por isso usamos dois dicionários separados:
 * MODELOS_CARROS e MODELOS_MOTOS, em vez de um único MODELOS_POR_MARCA.
 */

export const MARCAS_CARROS: string[] = [
  "Acura","Agrale","Alfa Romeo","Aston Martin","Audi","BMW","BYD","Cadillac",
  "Caoa Chery","Chery","Chevrolet","Chrysler","Citroën","Daewoo","Daihatsu",
  "Dodge","Ferrari","Fiat","Ford","GWM","Geely","Great Wall","Honda","Hyundai",
  "Infiniti","JAC","Jaguar","Jeep","Kia","Lamborghini","Land Rover","Lexus",
  "Lifan","Mahindra","Maserati","Mazda","Mercedes-Benz","MINI","Mitsubishi",
  "Nissan","Peugeot","Porsche","RAM","Renault","Rolls-Royce","Subaru","Suzuki",
  "Toyota","Troller","Volkswagen","Volvo",
].sort();

export const MARCAS_MOTOS: string[] = [
  "Agrale","Aprilia","BMW","Can-Am","Dafra","Ducati","Harley-Davidson","Honda",
  "Husqvarna","Indian","Kawasaki","KTM","Kymco","Moto Guzzi","MV Agusta",
  "Piaggio","Royal Enfield","Shineray","Sundown","Suzuki","Traxx","Triumph",
  "TVS","Vespa","Voge","Yamaha","Zongshen",
].sort();

// ─── Modelos de CARROS por marca ──────────────────────────────────────────────
export const MODELOS_CARROS: Record<string, string[]> = {
  "Chevrolet": [
    "Agile","Astro","Astra","Aveodas","Blazer","Camaro","Captiva","Celta","Classic",
    "Cobalt","Corsa","Corvette","Cruze","Equinox","Kadett","Malibu","Montana",
    "Monza","Mpfi","Onix","Onix Plus","Prisma","S10","Silverado","Sonic","Spin",
    "Suburban","Tahoe","Tracker","Trailblazer","Trax","Vectra","Zafira",
  ].sort(),

  "Fiat": [
    "Argo","Brava","Bravo","Cronos","Doblo","Doblô","Ducato","Fastback","Fiorino",
    "Grande Punto","Idea","Linea","Marea","Mobi","Palio","Palio Weekend","Panorama",
    "Pulse","Punto","Siena","Stilo","Strada","Tempra","Tipo","Toro","Uno",
  ].sort(),

  "Ford": [
    "Bronco","Bronco Sport","C-Max","Courier","EcoSport","Edge","Escape","Expedition",
    "Explorer","F-150","F-250","Fiesta","Flex","Focus","Fusion","Galaxy","Ka",
    "Ka+","Maverick","Mondeo","Mustang","Puma","Ranger","Territory","Transit",
  ].sort(),

  "Volkswagen": [
    "Amarok","Arteon","Bora","CrossFox","Fox","Fusca","Gol","Golf","ID.4",
    "Jetta","Kombi","Nivus","Parati","Passat","Polo","Quantum","Saveiro",
    "Scirocco","Sharan","SpaceCross","SpaceFox","T-Cross","Taos","Tiguan",
    "Touareg","Up","Virtus","Voyage",
  ].sort(),

  "Honda": [
    "Accord","City","City Hatch","Civic","CR-V","CR-Z","Element","Fit","HR-V",
    "Insight","Jazz","Legend","Odyssey","Passport","Pilot","Prelude","Ridgeline",
    "WR-V","ZR-V",
  ].sort(),

  "Toyota": [
    "4Runner","Avalon","C-HR","Camry","Corolla","Corolla Cross","FJ Cruiser",
    "Fortuner","Hilux","Land Cruiser","Prius","RAV4","Rush","Sequoia","Sienna",
    "SW4","Tundra","Yaris","Yaris Sedan",
  ].sort(),

  "Hyundai": [
    "Azera","Creta","Elantra","Equus","Genesis","HB20","HB20S","HB20X",
    "i30","i30 N","ix35","Kona","Santa Fe","Sonata","Staria","Tucson","Veloster",
  ].sort(),

  "Nissan": [
    "350Z","370Z","Altima","Armada","Frontier","GT-R","Kicks","Leaf","March",
    "Maxima","Murano","Pathfinder","Sentra","Tiida","Titan","Versa","X-Trail",
  ].sort(),

  "Renault": [
    "Captur","Clio","Duster","Duster Oroch","Fluence","Jogger","Kangoo","Kardian",
    "Koleos","Kwid","Laguna","Logan","Master","Mégane","Oroch","Sandero",
    "Scenic","Symbol","Twingo","Zoe",
  ].sort(),

  "Jeep": [
    "Cherokee","Commander","Compass","Grand Cherokee","Meridian","Renegade","Wrangler",
  ].sort(),

  "Mitsubishi": [
    "ASX","Eclipse Cross","Galant","L200","L200 Triton","Lancer","Montero",
    "Outlander","Pajero","Pajero Dakar","Pajero Full","Pajero Sport",
  ].sort(),

  "Peugeot": [
    "2008","207","208","3008","301","307","308","408","5008","508",
    "Expert","Hoggar","Landtrek","Partner",
  ].sort(),

  "Citroën": [
    "Aircross","Berlingo","C1","C3","C3 Aircross","C4","C4 Cactus","C4 Picasso",
    "C5","C6","DS3","DS4","DS5","Jumper","Jumpy","Picasso","Xantia","Xsara",
  ].sort(),

  "Audi": [
    "A1","A2","A3","A4","A5","A6","A7","A8","e-tron","Q2","Q3","Q4","Q5","Q7",
    "Q8","R8","RS3","RS4","RS5","RS6","RS7","S3","S4","S5","S6","S7","S8","TT","TTS",
  ].sort(),

  "BMW": [
    "116i","118i","120i","125i","128ti","130i","135i","218i","220i","225i",
    "228i","316i","318i","320i","325i","328i","330i","335i","418i","420i",
    "428i","430i","435i","520i","523i","528i","530i","535i","540i","545i",
    "550i","M2","M3","M4","M5","M6","M8","X1","X2","X3","X4","X5","X6","X7",
    "Z4","i3","i4","i7","i8","iX",
  ].sort(),

  "Mercedes-Benz": [
    "A 180","A 200","A 250","A 45 AMG","B 180","B 200","C 180","C 200","C 250",
    "C 300","C 43 AMG","C 63 AMG","CLA 200","CLA 45 AMG","CLS 350","E 200",
    "E 250","E 300","E 350","EQA","EQC","G 300","G 350","G 500","G 63 AMG",
    "GLA 200","GLE 300","GLE 350","GLE 400","GLK 220","GLS 400","S 400",
    "S 500","S 580","SL","SLC","Sprinter","Vito",
  ].sort(),

  "Porsche": [
    "718 Boxster","718 Cayman","911","Cayenne","Macan","Panamera","Taycan",
  ].sort(),

  "Volvo": [
    "C30","C40","C70","S40","S60","S80","S90","V40","V60","V90","XC40","XC60","XC70","XC90",
  ].sort(),

  "Land Rover": [
    "Defender","Discovery","Discovery Sport","Freelander","Range Rover",
    "Range Rover Evoque","Range Rover Sport","Range Rover Velar",
  ].sort(),

  "Jaguar": ["E-Pace","F-Pace","F-Type","I-Pace","XE","XF","XJ"].sort(),

  "Subaru": [
    "BRZ","Crosstrek","Forester","Impreza","Legacy","Outback","WRX","WRX STI",
  ].sort(),

  "Mazda": [
    "2","3","6","CX-3","CX-30","CX-5","CX-60","CX-9","MX-5","RX-7","RX-8",
  ].sort(),

  "Suzuki": [
    "Grand Vitara","Jimny","Kizashi","Samurai","Swift","Vitara","SX4",
  ].sort(),

  "Ferrari": [
    "296 GTB","488 GTB","488 Spider","812 Superfast","California","F8 Tributo",
    "GTC4Lusso","LaFerrari","Portofino","Roma","SF90 Stradale",
  ].sort(),

  "Lamborghini": [
    "Aventador","Centenario","Diablo","Gallardo","Huracán","Murciélago","Sián","Urus",
  ].sort(),

  "Kia": [
    "Carnival","Cerato","EV6","Mohave","Niro","Optima","Picanto","Rio",
    "Seltos","Sorento","Soul","Sportage","Stinger","Stonic","Telluride",
  ].sort(),

  "Chery": [
    "Arrizo 5","Arrizo 6","Arrizo 7","Celer","Face","QQ","Tiggo 2","Tiggo 3",
    "Tiggo 4","Tiggo 5x","Tiggo 7","Tiggo 7 Pro","Tiggo 8","Tiggo 8 Pro",
  ].sort(),

  "Caoa Chery": [
    "Arrizo 5","Arrizo 6","Tiggo 2","Tiggo 4","Tiggo 5x","Tiggo 7","Tiggo 7 Pro",
    "Tiggo 8","Tiggo 8 Pro",
  ].sort(),

  "JAC": [
    "E-JS1","J2","J3","J5","J6","Refine","S1","S2","S3","S5","S7","T6","T8",
  ].sort(),

  "GWM": ["Ora 03","Poer","Wingle 7"].sort(),

  "BYD": ["Dolphin","Han","King","Seal","Song Plus","Tan","Atto 3"].sort(),

  "MINI": [
    "Clubman","Convertible","Cooper","Cooper S","Countryman","Coupe","Paceman","Roadster",
  ].sort(),

  "Dodge": ["Challenger","Charger","Dart","Durango","Journey","Ram","Viper"].sort(),

  "Chrysler": ["200","300","300C","Crossfire","Grand Voyager","PT Cruiser","Sebring"].sort(),

  "RAM": ["1500","2500","3500","700","Classic","Rampage"].sort(),

  "Alfa Romeo": ["Giulia","Giulietta","Stelvio","Tonale"].sort(),
};

// ─── Modelos de MOTOS por marca ───────────────────────────────────────────────
export const MODELOS_MOTOS: Record<string, string[]> = {
  "Honda": [
    "Africa Twin","Biz 100","Biz 110i","Biz 125","Bros 125","Bros 150","CB 250F",
    "CB 300F","CB 300R","CB 300 Twister","CB 500F","CB 500X","CB 600F Hornet",
    "CB 650R","CB 650F","CB 1000R","CB 1000X","CBR 500R","CBR 600RR","CBR 1000RR",
    "CBX 200","CG 125","CG 150","CG 160","CG 160 Fan","CG 160 Start",
    "CG 160 Titan","CG 300","Elite 125","NC 750","NXR 150 Bros","PCX 150",
    "PCX 160","Pop 110i","SH 150","Tornado","Transalp","XRE 190","XRE 300",
  ].sort(),

  "Yamaha": [
    "Crosser 150","Crosser 155","Factor 125","Factor 150","FZ 25","Fazer 150",
    "Fazer 250","Lander 250","MT-03","MT-07","MT-09","MT-10","NMAX 160",
    "R1","R3","R6","R7","T-MAX","Tenere 250","Tenere 700","TDM 850",
    "Tracer 900","V-Star","XJ6","XTZ 125","XTZ 150","XTZ 250 Lander",
    "XTZ 250 Tenere",
  ].sort(),

  "Kawasaki": [
    "Ninja 300","Ninja 400","Ninja 650","Ninja ZX-10R","Ninja H2","Ninja 1000",
    "Versys 300","Versys 650","Versys 1000","W800","Z400","Z650","Z900","Z1000",
    "KLX 150","KX 450","Vulcan 900","Vulcan S",
  ].sort(),

  "Suzuki": [
    "Bandit 650","Bandit 1250","Burgman 125","Burgman 400","DL 650 V-Strom",
    "DL 1000 V-Strom","GSX-R 600","GSX-R 750","GSX-R 1000","GSX-S750",
    "GSX-S1000","Intruder 125","Intruder 250","Hayabusa","GS500","Inazuma 250",
    "RM 250","RMZ 450",
  ].sort(),

  "BMW": [
    "F 700 GS","F 800 GS","F 850 GS","F 900 R","G 310 GS","G 310 R",
    "G 450 X","GS Adventure","K 1200 GT","K 1600 B","M 1000 R","M 1000 RR",
    "R 1200 GS","R 1250 GS","R 1250 RT","R 18","S 1000 R","S 1000 RR","S 1000 XR",
  ].sort(),

  "Ducati": [
    "Diavel","Hypermotard","Monster 821","Monster 937","Multistrada",
    "Panigale V2","Panigale V4","Scrambler","Streetfighter","Supersport",
  ].sort(),

  "Harley-Davidson": [
    "CVO Limited","CVO Street Glide","Fat Bob","Fat Boy","Heritage","Iron 883",
    "Iron 1200","Low Rider","Night Rod","Nightster","Pan America","Road Glide",
    "Road King","Softail","Sportster","Street 500","Street 750","Street Bob",
    "Street Glide","Superlow",
  ].sort(),

  "KTM": [
    "200 Duke","390 Adventure","390 Duke","690 Duke","790 Adventure",
    "890 Adventure","990 Adventure","1090 Adventure","1190 Adventure",
    "1290 Super Adventure","RC 390",
  ].sort(),

  "Triumph": [
    "Bonneville","Explorer","Scrambler","Speed Triple","Street Triple",
    "Tiger 800","Tiger 900","Tiger Sport","Thunderbird","Thruxton","Tiger 1200",
  ].sort(),

  "Dafra": [
    "Apache 150","Apache 200","Big Max 150","Boston 150","Formula 125",
    "Kansas 150","Laser 150","Maxsym 400","Next 250","Riva 150","Rocket 250",
    "Smart 125","Speed 150",
  ].sort(),

  "Royal Enfield": [
    "Bullet 350","Classic 350","Continental GT","Himalayan","Hunter 350",
    "Interceptor 650","Meteor 350","Scram 411","Super Meteor 650",
  ].sort(),
};

// ─── Compatibilidade: mapa unificado por tipo (para uso no useFIPE) ────────────
/** @deprecated Use MODELOS_CARROS ou MODELOS_MOTOS diretamente. */
export const MODELOS_POR_MARCA = MODELOS_CARROS;
