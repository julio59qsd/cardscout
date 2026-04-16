export const CARDS = [
  // ONE PIECE
  { id:'op1', universe:'onepiece', name:'Monkey D. Luffy', set:'OP-01 Romance Dawn', setId:'op01', rarity:'Super Rare', emoji:'🍖', prices:{ cardmarket:{avg:180,low:155,trend:175,avg7:178,avg30:172}, tcgplayer:{market:195,mid:200,low:150} }, score:9.6, t6:[90,110,135,155,168,180], t12:[50,62,75,88,100,112,125,138,150,162,172,180] },
  { id:'op2', universe:'onepiece', name:'Roronoa Zoro', set:'OP-01 Romance Dawn', setId:'op01', rarity:'Alternate Art', emoji:'⚔️', prices:{ cardmarket:{avg:65,low:55,trend:63,avg7:64,avg30:62}, tcgplayer:{market:72,mid:75,low:55} }, score:8.1, t6:[30,38,46,54,60,65], t12:[18,24,30,36,42,48,52,56,59,62,64,65] },
  { id:'op3', universe:'onepiece', name:'Portgas D. Ace', set:'OP-05 Awakening', setId:'op05', rarity:'Super Rare', emoji:'🔥', prices:{ cardmarket:{avg:48,low:40,trend:46,avg7:47,avg30:45}, tcgplayer:{market:52,mid:55,low:40} }, score:7.9, t6:[28,32,36,40,44,48], t12:[16,20,24,28,32,35,38,40,42,44,46,48] },
  { id:'op4', universe:'onepiece', name:'Trafalgar Law Parallel', set:'OP-10 Royal Blood', setId:'op10', rarity:'Parallel Rare', emoji:'⚓', prices:{ cardmarket:{avg:52,low:44,trend:50,avg7:51,avg30:49}, tcgplayer:{market:58,mid:60,low:44} }, score:8.3, t6:[22,28,34,40,46,52], t12:[8,12,16,20,24,28,32,36,40,44,48,52] },
  { id:'op5', universe:'onepiece', name:'Shanks Leader', set:'OP-04 Kingdoms of Intrigue', setId:'op04', rarity:'Leader', emoji:'🏴‍☠️', prices:{ cardmarket:{avg:35,low:28,trend:33,avg7:34,avg30:32}, tcgplayer:{market:38,mid:40,low:28} }, score:7.5, t6:[20,22,26,29,32,35], t12:[10,13,15,18,20,22,24,26,28,30,33,35] },
  { id:'op6', universe:'onepiece', name:'Silvers Rayleigh', set:'OP-08 Two Legends', setId:'op08', rarity:'Super Rare', emoji:'⚡', prices:{ cardmarket:{avg:42,low:35,trend:40,avg7:41,avg30:39}, tcgplayer:{market:46,mid:48,low:35} }, score:7.7, t6:[20,24,28,33,37,42], t12:[10,13,16,20,24,27,30,33,36,38,40,42] },
  { id:'op7', universe:'onepiece', name:'Boa Hancock Alt Art', set:'OP-02 Paramount War', setId:'op02', rarity:'Alternate Art', emoji:'🐍', prices:{ cardmarket:{avg:38,low:30,trend:36,avg7:37,avg30:35}, tcgplayer:{market:42,mid:44,low:30} }, score:7.4, t6:[18,22,26,30,34,38], t12:[8,10,12,15,18,21,24,27,30,33,36,38] },
  { id:'op8', universe:'onepiece', name:'Nami SR', set:'OP-06 Wings', setId:'op06', rarity:'Super Rare', emoji:'🌊', prices:{ cardmarket:{avg:28,low:22,trend:26,avg7:27,avg30:25}, tcgplayer:{market:30,mid:32,low:22} }, score:7.0, t6:[14,17,20,23,25,28], t12:[6,8,10,12,14,16,18,20,22,24,26,28] },

  // MTG
  { id:'m1', universe:'mtg', name:'Black Lotus', set:'Alpha Edition (1993)', setId:'lea', rarity:'Rare', emoji:'🌸', prices:{ cardmarket:{avg:15000,low:12000,trend:14500,avg7:14800,avg30:14200}, tcgplayer:{market:16000,mid:17000,low:12000} }, score:9.9, t6:[12000,12800,13200,14000,14600,15000], t12:[9800,10300,10900,11400,11900,12300,12700,13100,13500,13900,14400,15000] },
  { id:'m2', universe:'mtg', name:'Gandalf Alt Art', set:'Lord of the Rings', setId:'ltr', rarity:'Special Illus. Rare', emoji:'🧙', prices:{ cardmarket:{avg:75,low:62,trend:72,avg7:74,avg30:70}, tcgplayer:{market:82,mid:85,low:62} }, score:8.2, t6:[38,48,56,63,69,75], t12:[18,24,30,36,42,46,50,55,60,65,70,75] },
  { id:'m3', universe:'mtg', name:'Mox Sapphire', set:'Alpha Edition (1993)', setId:'lea', rarity:'Rare', emoji:'💎', prices:{ cardmarket:{avg:7500,low:6200,trend:7200,avg7:7400,avg30:7100}, tcgplayer:{market:8000,mid:8500,low:6200} }, score:9.6, t6:[6000,6400,6700,7000,7200,7500], t12:[4800,5100,5400,5700,5900,6100,6300,6500,6700,6900,7200,7500] },
  { id:'m4', universe:'mtg', name:'Ragavan Nimble Pilferer', set:'Modern Horizons 2', setId:'mh2', rarity:'Mythic Rare', emoji:'🐒', prices:{ cardmarket:{avg:38,low:30,trend:36,avg7:37,avg30:35}, tcgplayer:{market:42,mid:44,low:30} }, score:7.2, t6:[50,48,46,43,40,38], t12:[65,62,58,55,52,50,48,46,44,42,40,38] },

  // LORCANA
  { id:'l1', universe:'lorcana', name:'Stitch Enchanted', set:'The First Chapter', setId:'tfc', rarity:'Enchanted', emoji:'✨', prices:{ cardmarket:{avg:320,low:270,trend:310,avg7:315,avg30:305}, tcgplayer:{market:350,mid:360,low:270} }, score:9.8, t6:[175,205,240,270,295,320], t12:[78,95,115,138,158,178,198,220,248,272,298,320] },
  { id:'l2', universe:'lorcana', name:'Elsa Enchanted', set:'Into the Inklands', setId:'iti', rarity:'Enchanted', emoji:'❄️', prices:{ cardmarket:{avg:280,low:235,trend:270,avg7:275,avg30:265}, tcgplayer:{market:305,mid:315,low:235} }, score:9.5, t6:[150,180,210,240,262,280], t12:[65,82,100,122,142,160,178,196,215,238,262,280] },
  { id:'l3', universe:'lorcana', name:'Mickey Mouse Foil', set:'The First Chapter', setId:'tfc', rarity:'Rare', emoji:'🐭', prices:{ cardmarket:{avg:18,low:14,trend:17,avg7:17,avg30:16}, tcgplayer:{market:20,mid:21,low:14} }, score:6.5, t6:[12,13,14,15,16,18], t12:[8,9,10,11,12,13,14,15,15,16,17,18] },
  { id:'l4', universe:'lorcana', name:'Moana Legendary', set:'Rise of the Floodborn', setId:'rof', rarity:'Legendary', emoji:'🌊', prices:{ cardmarket:{avg:55,low:45,trend:52,avg7:54,avg30:51}, tcgplayer:{market:60,mid:63,low:45} }, score:7.6, t6:[28,34,39,44,50,55], t12:[12,16,20,24,28,32,35,38,42,46,50,55] },

  // DRAGON BALL
  { id:'d1', universe:'dbs', name:'Son Goku Full Power', set:'Fusion World Vol.1', setId:'fb01', rarity:'Secret Rare', emoji:'🐉', prices:{ cardmarket:{avg:180,low:150,trend:174,avg7:178,avg30:170}, tcgplayer:{market:195,mid:200,low:150} }, score:8.9, t6:[108,122,138,152,166,180], t12:[58,70,82,95,108,118,128,138,148,158,168,180] },
  { id:'d2', universe:'dbs', name:'Vegeta Super Saiyan 4', set:'Fusion World Vol.2', setId:'fb02', rarity:'Special Rare', emoji:'💥', prices:{ cardmarket:{avg:55,low:44,trend:52,avg7:54,avg30:50}, tcgplayer:{market:60,mid:62,low:44} }, score:7.8, t6:[24,30,36,42,48,55], t12:[9,12,16,20,24,28,32,36,40,44,49,55] },
  { id:'d3', universe:'dbs', name:'Son Goku 1ère éd.', set:'Galactic Battle (2018)', setId:'bt01', rarity:'Super Rare', emoji:'🌟', prices:{ cardmarket:{avg:220,low:180,trend:212,avg7:217,avg30:210}, tcgplayer:{market:238,mid:245,low:180} }, score:8.5, t6:[150,165,178,190,204,220], t12:[80,95,110,125,135,148,158,168,178,190,205,220] },
];

export const SETS = [
  { id:'op01', universe:'onepiece', name:'OP-01 Romance Dawn', code:'OP-01', date:'2022-12', cards:121, type:'main' },
  { id:'op02', universe:'onepiece', name:'OP-02 Paramount War', code:'OP-02', date:'2023-03', cards:121, type:'main' },
  { id:'op04', universe:'onepiece', name:'OP-04 Kingdoms of Intrigue', code:'OP-04', date:'2023-09', cards:121, type:'main' },
  { id:'op05', universe:'onepiece', name:'OP-05 Awakening of the New Era', code:'OP-05', date:'2023-12', cards:121, type:'main' },
  { id:'op06', universe:'onepiece', name:'OP-06 Wings of the Captain', code:'OP-06', date:'2024-03', cards:121, type:'main' },
  { id:'op08', universe:'onepiece', name:'OP-08 Two Legends', code:'OP-08', date:'2024-09', cards:121, type:'main' },
  { id:'op10', universe:'onepiece', name:'OP-10 Royal Blood', code:'OP-10', date:'2025-03', cards:144, type:'main' },
  { id:'op13', universe:'onepiece', name:'OP-13 Carrying On His Will', code:'OP-13', date:'2025-11', cards:144, type:'main' },
  { id:'lea', universe:'mtg', name:'Alpha Edition (1993)', code:'LEA', date:'1993-08', cards:295, type:'vintage' },
  { id:'ltr', universe:'mtg', name:'Lord of the Rings', code:'LTR', date:'2023-06', cards:281, type:'collab' },
  { id:'mh2', universe:'mtg', name:'Modern Horizons 2', code:'MH2', date:'2021-06', cards:303, type:'main' },
  { id:'dsk', universe:'mtg', name:'Duskmourn', code:'DSK', date:'2024-09', cards:276, type:'main' },
  { id:'tfc', universe:'lorcana', name:'The First Chapter', code:'TFC', date:'2023-08', cards:204, type:'main' },
  { id:'rof', universe:'lorcana', name:'Rise of the Floodborn', code:'ROF', date:'2023-11', cards:204, type:'main' },
  { id:'iti', universe:'lorcana', name:'Into the Inklands', code:'ITI', date:'2024-02', cards:204, type:'main' },
  { id:'arc', universe:'lorcana', name:"Archazia's Island", code:'ARC', date:'2025-02', cards:204, type:'main' },
  { id:'bt01', universe:'dbs', name:'Galactic Battle (2018)', code:'BT01', date:'2018-07', cards:165, type:'vintage' },
  { id:'fb01', universe:'dbs', name:'Fusion World Vol.1', code:'FB01', date:'2024-02', cards:177, type:'fw' },
  { id:'fb02', universe:'dbs', name:'Fusion World Vol.2', code:'FB02', date:'2024-07', cards:177, type:'fw' },
  { id:'fb03', universe:'dbs', name:'Fusion World Vol.3', code:'FB03', date:'2024-12', cards:177, type:'fw' },
  { id:'fb04', universe:'dbs', name:'Fusion World Vol.4', code:'FB04', date:'2025-05', cards:177, type:'fw' },
];

export const SEALED = [
  { id:'s1', universe:'pokemon', name:'Booster Box — Évolutions Prismatiques', type:'booster_box', emoji:'📦', retail:220, mkt:420, t6:[180,220,265,320,370,420], note:'Production limitée — forte appréciation continue.' },
  { id:'s2', universe:'pokemon', name:'Elite Trainer Box — Évol. Prismatiques', type:'etb', emoji:'🎁', retail:50, mkt:95, t6:[50,55,62,72,82,95], note:'ETB Pokemon Center exclusif à 150-200€.' },
  { id:'s3', universe:'pokemon', name:'Booster Box — Evolving Skies', type:'booster_box', emoji:'📦', retail:145, mkt:350, t6:[145,170,215,265,310,350], note:'Set culte Eeveelution — hors production.' },
  { id:'s4', universe:'pokemon', name:'Base Set Box scellé (1999)', type:'vintage', emoji:'🏺', retail:11, mkt:45000, t6:[38000,40000,41000,42500,43500,45000], note:'Graal absolu du marché Pokémon vintage.' },
  { id:'s5', universe:'onepiece', name:'Booster Box — OP-01 Romance Dawn', type:'booster_box', emoji:'📦', retail:90, mkt:380, t6:[90,130,185,255,315,380], note:'1er set historique — Leader Luffy très recherché.' },
  { id:'s6', universe:'onepiece', name:'Booster Box — OP-08 Two Legends', type:'booster_box', emoji:'📦', retail:90, mkt:160, t6:[90,98,110,128,145,160], note:'Rayleigh et Barbe Blanche en vedette.' },
  { id:'s7', universe:'yugioh', name:'Booster Box — 25th Rarity Collection', type:'booster_box', emoji:'📦', retail:90, mkt:220, t6:[90,112,142,172,196,220], note:'QC Secrets très rares et demandés.' },
  { id:'s8', universe:'yugioh', name:'Booster Box — LOB 1ère édition', type:'vintage', emoji:'🏺', retail:5, mkt:28000, t6:[14000,17000,20000,23000,25500,28000], note:'Boîte 1ère édition 2002 — pièce de collection.' },
  { id:'s9', universe:'mtg', name:'Collector Booster Box — Lord of the Rings', type:'collector_box', emoji:'💎', retail:300, mkt:480, t6:[300,320,352,392,432,480], note:'Anneau unique serialized possible inclus.' },
  { id:'s10', universe:'lorcana', name:'Booster Box — The First Chapter', type:'booster_box', emoji:'📦', retail:95, mkt:280, t6:[95,120,158,198,238,280], note:'Premier set Lorcana — forte appréciation.' },
  { id:'s11', universe:'dbs', name:'Booster Box — Fusion World Vol.1', type:'booster_box', emoji:'📦', retail:80, mkt:185, t6:[80,96,112,138,162,185], note:'Lancement FW — Goku Leader très populaire.' },
];
