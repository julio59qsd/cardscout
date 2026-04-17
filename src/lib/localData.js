export const CARDS = [
  // ONE PIECE — OP-01 Romance Dawn
  { id:'op2', universe:'onepiece', name:'Roronoa Zoro', set:'OP-01 Romance Dawn', setId:'op01', number:'OP01-001', rarity:'Alternate Art', emoji:'⚔️', prices:{ cardmarket:{avg:465,low:380,trend:458,avg7:462,avg30:450}, tcgplayer:{market:510,mid:525,low:380} }, score:8.1, t6:[340,370,400,430,455,465], t12:[180,200,220,250,280,310,340,370,400,430,455,465] },
  { id:'op1', universe:'onepiece', name:'Monkey D. Luffy', set:'OP-01 Romance Dawn', setId:'op01', number:'OP01-024', rarity:'Super Rare', emoji:'🍖', prices:{ cardmarket:{avg:85,low:72,trend:83,avg7:84,avg30:82}, tcgplayer:{market:93,mid:96,low:72} }, score:9.6, t6:[83,83,84,84,85,85], t12:[78,79,80,81,82,82,83,83,84,84,85,85] },
  // ONE PIECE — OP-02 Paramount War
  { id:'op7', universe:'onepiece', name:'Boa Hancock Alt Art', set:'OP-02 Paramount War', setId:'op02', number:'OP02-059', rarity:'Alternate Art', emoji:'🐍', prices:{ cardmarket:{avg:11,low:8,trend:10,avg7:11,avg30:9}, tcgplayer:{market:12,mid:13,low:8} }, score:7.4, t6:[10,10,10,11,11,11], t12:[8,8,9,9,9,10,10,10,10,11,11,11] },
  // ONE PIECE — OP-04 Kingdoms of Intrigue
  { id:'op5', universe:'onepiece', name:'Shanks Leader', set:'OP-04 Kingdoms of Intrigue', setId:'op04', number:'OP04-001', rarity:'Leader', emoji:'🏴‍☠️', prices:{ cardmarket:{avg:12,low:8,trend:11,avg7:12,avg30:10}, tcgplayer:{market:13,mid:14,low:8} }, score:7.5, t6:[10,10,11,11,11,12], t12:[8,8,9,9,9,10,10,10,11,11,11,12] },
  // ONE PIECE — OP-05 Awakening of the New Era
  { id:'op3', universe:'onepiece', name:'Portgas D. Ace', set:'OP-05 Awakening', setId:'op05', number:'OP05-019', rarity:'Super Rare', emoji:'🔥', prices:{ cardmarket:{avg:18,low:12,trend:16,avg7:17,avg30:15}, tcgplayer:{market:20,mid:22,low:12} }, score:7.9, t6:[14,15,15,16,17,18], t12:[10,11,12,12,13,13,14,15,15,16,17,18] },
  // ONE PIECE — OP-06 Wings of the Captain
  { id:'op8', universe:'onepiece', name:'Nami SR', set:'OP-06 Wings', setId:'op06', number:'OP06-101', rarity:'Super Rare', emoji:'🌊', prices:{ cardmarket:{avg:12,low:8,trend:10,avg7:11,avg30:10}, tcgplayer:{market:13,mid:14,low:8} }, score:7.0, t6:[10,10,11,11,12,12], t12:[7,7,8,8,9,9,10,10,11,11,12,12] },
  // ONE PIECE — OP-08 Two Legends
  { id:'op6', universe:'onepiece', name:'Silvers Rayleigh', set:'OP-08 Two Legends', setId:'op08', number:'OP08-118', rarity:'Super Rare', emoji:'⚡', prices:{ cardmarket:{avg:18,low:12,trend:16,avg7:17,avg30:15}, tcgplayer:{market:20,mid:21,low:12} }, score:7.7, t6:[14,15,15,16,17,18], t12:[8,9,10,11,12,12,14,15,15,16,17,18] },
  // ONE PIECE — OP-10 Royal Blood
  { id:'op4', universe:'onepiece', name:'Trafalgar Law Parallel', set:'OP-10 Royal Blood', setId:'op10', number:'OP10-119', rarity:'Parallel Rare', emoji:'⚓', prices:{ cardmarket:{avg:20,low:14,trend:18,avg7:19,avg30:17}, tcgplayer:{market:22,mid:24,low:14} }, score:8.3, t6:[22,22,21,21,20,20], t12:[28,27,26,25,24,23,22,22,21,21,20,20] },

  // MTG — Alpha Edition (1993)
  { id:'m1', universe:'mtg', name:'Black Lotus', set:'Alpha Edition (1993)', setId:'lea', number:'LEA-232', rarity:'Rare', emoji:'🌸', prices:{ cardmarket:{avg:18500,low:12000,trend:18000,avg7:18200,avg30:17500}, tcgplayer:{market:20000,mid:22000,low:12000} }, score:9.9, t6:[16000,16500,17000,17500,18000,18500], t12:[12000,13000,13500,14000,14500,15000,16000,16500,17000,17500,18000,18500] },
  { id:'m3', universe:'mtg', name:'Mox Sapphire', set:'Alpha Edition (1993)', setId:'lea', number:'LEA-265', rarity:'Rare', emoji:'💎', prices:{ cardmarket:{avg:7200,low:5800,trend:7000,avg7:7100,avg30:6900}, tcgplayer:{market:7800,mid:8200,low:5800} }, score:9.6, t6:[6600,6700,6800,6900,7100,7200], t12:[5200,5500,5700,5900,6000,6200,6600,6700,6800,6900,7100,7200] },
  // MTG — Modern Horizons 2 (2021)
  { id:'m4', universe:'mtg', name:'Ragavan Nimble Pilferer', set:'Modern Horizons 2', setId:'mh2', number:'MH2-138', rarity:'Mythic Rare', emoji:'🐒', prices:{ cardmarket:{avg:32,low:25,trend:31,avg7:32,avg30:30}, tcgplayer:{market:35,mid:37,low:25} }, score:7.2, t6:[35,34,33,33,32,32], t12:[42,40,38,37,36,36,35,34,33,33,32,32] },
  // MTG — Lord of the Rings (2023)
  { id:'m2', universe:'mtg', name:'Gandalf Alt Art', set:'Lord of the Rings', setId:'ltr', number:'LTR-386', rarity:'Special Illus. Rare', emoji:'🧙', prices:{ cardmarket:{avg:10,low:5,trend:9,avg7:10,avg30:9}, tcgplayer:{market:11,mid:12,low:5} }, score:8.2, t6:[12,11,10,9,10,10], t12:[18,16,15,14,13,12,12,11,10,9,10,10] },

  // LORCANA — The First Chapter (2023)
  { id:'l1', universe:'lorcana', name:'Stitch Enchanted', set:'The First Chapter', setId:'tfc', number:'TFC-206', rarity:'Enchanted', emoji:'✨', prices:{ cardmarket:{avg:130,low:100,trend:125,avg7:128,avg30:122}, tcgplayer:{market:142,mid:148,low:100} }, score:9.8, t6:[155,148,142,138,132,130], t12:[200,190,180,172,165,160,155,148,142,138,132,130] },
  { id:'l3', universe:'lorcana', name:'Mickey Mouse Foil', set:'The First Chapter', setId:'tfc', number:'TFC-208', rarity:'Rare', emoji:'🐭', prices:{ cardmarket:{avg:16,low:12,trend:15,avg7:16,avg30:14}, tcgplayer:{market:18,mid:19,low:12} }, score:6.5, t6:[15,15,15,16,16,16], t12:[12,12,13,13,14,14,15,15,15,16,16,16] },
  // LORCANA — Rise of the Floodborn (2023)
  { id:'l4', universe:'lorcana', name:'Moana Legendary', set:'Rise of the Floodborn', setId:'rof', number:'ROF-100', rarity:'Legendary', emoji:'🌊', prices:{ cardmarket:{avg:28,low:20,trend:26,avg7:27,avg30:24}, tcgplayer:{market:31,mid:33,low:20} }, score:7.6, t6:[32,31,30,29,28,28], t12:[40,38,36,35,34,33,32,31,30,29,28,28] },
  // LORCANA — Into the Inklands (2024)
  { id:'l2', universe:'lorcana', name:'Elsa Enchanted', set:'Into the Inklands', setId:'iti', number:'ITI-207', rarity:'Enchanted', emoji:'❄️', prices:{ cardmarket:{avg:280,low:235,trend:270,avg7:275,avg30:265}, tcgplayer:{market:305,mid:315,low:235} }, score:9.5, t6:[260,265,270,273,276,280], t12:[220,230,238,245,250,255,260,265,270,273,276,280] },

  // DRAGON BALL — Galactic Battle (2018)
  { id:'d3', universe:'dbs', name:'Son Goku 1ère éd.', set:'Galactic Battle (2018)', setId:'bt01', number:'BT01-031', rarity:'Super Rare', emoji:'🌟', prices:{ cardmarket:{avg:100,low:80,trend:98,avg7:99,avg30:96}, tcgplayer:{market:110,mid:115,low:80} }, score:8.5, t6:[95,96,97,98,99,100], t12:[88,89,90,91,92,93,95,96,97,98,99,100] },
  // DRAGON BALL — Fusion World Vol.1 (2024)
  { id:'d1', universe:'dbs', name:'Son Goku Full Power', set:'Fusion World Vol.1', setId:'fb01', number:'FB01-139', rarity:'Secret Rare', emoji:'🐉', prices:{ cardmarket:{avg:35,low:25,trend:33,avg7:34,avg30:31}, tcgplayer:{market:38,mid:40,low:25} }, score:8.9, t6:[42,40,38,37,36,35], t12:[65,60,55,50,48,46,42,40,38,37,36,35] },
  // DRAGON BALL — Fusion World Vol.2 (2024)
  { id:'d2', universe:'dbs', name:'Vegeta Super Saiyan 4', set:'Fusion World Vol.2', setId:'fb02', number:'FB02-139', rarity:'Special Rare', emoji:'💥', prices:{ cardmarket:{avg:16,low:10,trend:14,avg7:15,avg30:13}, tcgplayer:{market:18,mid:19,low:10} }, score:7.8, t6:[22,20,19,18,17,16], t12:[35,30,28,26,24,23,22,20,19,18,17,16] },

  // POKEMON — Energie Mega Evolution
  { id:'emeg1', universe:'pokemon', name:'Énergie Feu', set:'Energie Mega Evolution', setId:'emeg', number:'EMEG-001', rarity:'Common', emoji:'🔥', prices:{ cardmarket:{avg:2,low:1,trend:2,avg7:2,avg30:2}, tcgplayer:{market:2,mid:2,low:1} }, score:4.0, t6:[1,1,2,2,2,2], t12:[1,1,1,1,1,2,2,2,2,2,2,2] },
  { id:'emeg2', universe:'pokemon', name:'Énergie Eau', set:'Energie Mega Evolution', setId:'emeg', number:'EMEG-002', rarity:'Common', emoji:'💧', prices:{ cardmarket:{avg:2,low:1,trend:2,avg7:2,avg30:2}, tcgplayer:{market:2,mid:2,low:1} }, score:4.0, t6:[1,1,2,2,2,2], t12:[1,1,1,1,1,2,2,2,2,2,2,2] },
  { id:'emeg3', universe:'pokemon', name:'Énergie Plante', set:'Energie Mega Evolution', setId:'emeg', number:'EMEG-003', rarity:'Common', emoji:'🌿', prices:{ cardmarket:{avg:2,low:1,trend:2,avg7:2,avg30:2}, tcgplayer:{market:2,mid:2,low:1} }, score:4.0, t6:[1,1,2,2,2,2], t12:[1,1,1,1,1,2,2,2,2,2,2,2] },
  { id:'emeg4', universe:'pokemon', name:'Énergie Électrique', set:'Energie Mega Evolution', setId:'emeg', number:'EMEG-004', rarity:'Common', emoji:'⚡', prices:{ cardmarket:{avg:2,low:1,trend:2,avg7:2,avg30:2}, tcgplayer:{market:2,mid:2,low:1} }, score:4.0, t6:[1,1,2,2,2,2], t12:[1,1,1,1,1,2,2,2,2,2,2,2] },
  { id:'emeg5', universe:'pokemon', name:'Énergie Psy', set:'Energie Mega Evolution', setId:'emeg', number:'EMEG-005', rarity:'Common', emoji:'🔮', prices:{ cardmarket:{avg:2,low:1,trend:2,avg7:2,avg30:2}, tcgplayer:{market:2,mid:2,low:1} }, score:4.0, t6:[1,1,2,2,2,2], t12:[1,1,1,1,1,2,2,2,2,2,2,2] },
  { id:'emeg6', universe:'pokemon', name:'Énergie Combat', set:'Energie Mega Evolution', setId:'emeg', number:'EMEG-006', rarity:'Common', emoji:'👊', prices:{ cardmarket:{avg:2,low:1,trend:2,avg7:2,avg30:2}, tcgplayer:{market:2,mid:2,low:1} }, score:4.0, t6:[1,1,2,2,2,2], t12:[1,1,1,1,1,2,2,2,2,2,2,2] },
  { id:'emeg7', universe:'pokemon', name:'Énergie Obscurité', set:'Energie Mega Evolution', setId:'emeg', number:'EMEG-007', rarity:'Common', emoji:'🌑', prices:{ cardmarket:{avg:2,low:1,trend:2,avg7:2,avg30:2}, tcgplayer:{market:2,mid:2,low:1} }, score:4.0, t6:[1,1,2,2,2,2], t12:[1,1,1,1,1,2,2,2,2,2,2,2] },
  { id:'emeg8', universe:'pokemon', name:'Énergie Métal', set:'Energie Mega Evolution', setId:'emeg', number:'EMEG-008', rarity:'Common', emoji:'⚙️', prices:{ cardmarket:{avg:2,low:1,trend:2,avg7:2,avg30:2}, tcgplayer:{market:2,mid:2,low:1} }, score:4.0, t6:[1,1,2,2,2,2], t12:[1,1,1,1,1,2,2,2,2,2,2,2] },

  // POKEMON — Perfect Order (mars 2026)
  { id:'p1', universe:'pokemon', name:'Mega Zygarde ex', set:'Perfect Order', setId:'pfo', number:'PFO-025', rarity:'Hyper Rare', emoji:'🟩', prices:{ cardmarket:{avg:180,low:145,trend:175,avg7:178,avg30:168}, tcgplayer:{market:195,mid:205,low:145} }, score:9.4, t6:[0,0,0,0,220,180], t12:[0,0,0,0,0,0,0,0,0,0,220,180] },
  { id:'p2', universe:'pokemon', name:'Mega Zygarde ex (SIR)', set:'Perfect Order', setId:'pfo', number:'PFO-126', rarity:'Special Illustration Rare', emoji:'🟩', prices:{ cardmarket:{avg:130,low:100,trend:125,avg7:128,avg30:118}, tcgplayer:{market:142,mid:150,low:100} }, score:9.1, t6:[0,0,0,0,155,130], t12:[0,0,0,0,0,0,0,0,0,0,155,130] },
  { id:'p3', universe:'pokemon', name:'Meowth ex (SIR)', set:'Perfect Order', setId:'pfo', number:'PFO-127', rarity:'Special Illustration Rare', emoji:'😸', prices:{ cardmarket:{avg:115,low:90,trend:110,avg7:112,avg30:105}, tcgplayer:{market:125,mid:132,low:90} }, score:8.8, t6:[0,0,0,0,140,115], t12:[0,0,0,0,0,0,0,0,0,0,140,115] },
  { id:'p4', universe:'pokemon', name:"Rosa's Encouragement (SIR)", set:'Perfect Order', setId:'pfo', number:'PFO-128', rarity:'Special Illustration Rare', emoji:'🌸', prices:{ cardmarket:{avg:95,low:72,trend:90,avg7:93,avg30:86}, tcgplayer:{market:104,mid:110,low:72} }, score:8.5, t6:[0,0,0,0,110,95], t12:[0,0,0,0,0,0,0,0,0,0,110,95] },
  { id:'p5', universe:'pokemon', name:'Mega Starmie ex (SIR)', set:'Perfect Order', setId:'pfo', number:'PFO-129', rarity:'Special Illustration Rare', emoji:'⭐', prices:{ cardmarket:{avg:75,low:58,trend:72,avg7:74,avg30:68}, tcgplayer:{market:82,mid:87,low:58} }, score:8.2, t6:[0,0,0,0,90,75], t12:[0,0,0,0,0,0,0,0,0,0,90,75] },
];

export const SETS = [
  // POKÉMON TCG — Wizards era (1999–2003)
  { id:'base1', universe:'pokemon', name:'Base Set', code:'BS', date:'1999-01', cards:102, type:'vintage' },
  { id:'ju', universe:'pokemon', name:'Jungle', code:'JU', date:'1999-06', cards:64, type:'vintage' },
  { id:'fo', universe:'pokemon', name:'Fossil', code:'FO', date:'1999-10', cards:62, type:'vintage' },
  { id:'bs2', universe:'pokemon', name:'Base Set 2', code:'BS2', date:'2000-02', cards:130, type:'vintage' },
  { id:'tr', universe:'pokemon', name:'Team Rocket', code:'TR', date:'2000-04', cards:82, type:'vintage' },
  { id:'gh', universe:'pokemon', name:'Gym Heroes', code:'GH', date:'2000-08', cards:132, type:'vintage' },
  { id:'gc', universe:'pokemon', name:'Gym Challenge', code:'GC', date:'2000-10', cards:132, type:'vintage' },
  { id:'n1', universe:'pokemon', name:'Neo Genesis', code:'N1', date:'2000-12', cards:111, type:'vintage' },
  { id:'n2', universe:'pokemon', name:'Neo Discovery', code:'N2', date:'2001-06', cards:75, type:'vintage' },
  { id:'n3', universe:'pokemon', name:'Neo Revelation', code:'N3', date:'2001-09', cards:66, type:'vintage' },
  { id:'n4', universe:'pokemon', name:'Neo Destiny', code:'N4', date:'2002-02', cards:113, type:'vintage' },
  { id:'lc', universe:'pokemon', name:'Legendary Collection', code:'LC', date:'2002-05', cards:110, type:'vintage' },
  { id:'exp', universe:'pokemon', name:'Expedition Base Set', code:'EXP', date:'2002-09', cards:165, type:'vintage' },
  { id:'aq', universe:'pokemon', name:'Aquapolis', code:'AQ', date:'2003-01', cards:186, type:'vintage' },
  { id:'sky', universe:'pokemon', name:'Skyridge', code:'SK', date:'2003-05', cards:182, type:'vintage' },
  // EX Series (2003–2007)
  { id:'ex1', universe:'pokemon', name:'EX Ruby & Sapphire', code:'RS', date:'2003-07', cards:109, type:'vintage' },
  { id:'ex2', universe:'pokemon', name:'EX Sandstorm', code:'SS', date:'2003-09', cards:100, type:'vintage' },
  { id:'ex3', universe:'pokemon', name:'EX Dragon', code:'DR', date:'2003-11', cards:97, type:'vintage' },
  { id:'ex4', universe:'pokemon', name:'EX Team Magma vs Team Aqua', code:'MA', date:'2004-03', cards:97, type:'vintage' },
  { id:'ex5', universe:'pokemon', name:'EX Hidden Legends', code:'HL', date:'2004-06', cards:101, type:'vintage' },
  { id:'ex6', universe:'pokemon', name:'EX FireRed & LeafGreen', code:'RG', date:'2004-08', cards:116, type:'vintage' },
  { id:'ex7', universe:'pokemon', name:'EX Team Rocket Returns', code:'TRR', date:'2004-11', cards:111, type:'vintage' },
  { id:'ex8', universe:'pokemon', name:'EX Deoxys', code:'DX', date:'2005-02', cards:108, type:'vintage' },
  { id:'ex9', universe:'pokemon', name:'EX Emerald', code:'EM', date:'2005-05', cards:106, type:'vintage' },
  { id:'ex10', universe:'pokemon', name:'EX Unseen Forces', code:'UF', date:'2005-08', cards:145, type:'vintage' },
  { id:'ex11', universe:'pokemon', name:'EX Delta Species', code:'DS', date:'2005-10', cards:114, type:'vintage' },
  { id:'ex12', universe:'pokemon', name:'EX Legend Maker', code:'LM', date:'2006-02', cards:92, type:'vintage' },
  { id:'ex13', universe:'pokemon', name:'EX Holon Phantoms', code:'HP', date:'2006-05', cards:110, type:'vintage' },
  { id:'ex14', universe:'pokemon', name:'EX Crystal Guardians', code:'CG', date:'2006-08', cards:100, type:'vintage' },
  { id:'ex15', universe:'pokemon', name:'EX Dragon Frontiers', code:'DF', date:'2006-11', cards:101, type:'vintage' },
  { id:'ex16', universe:'pokemon', name:'EX Power Keepers', code:'PK', date:'2007-02', cards:108, type:'vintage' },
  // Diamond & Pearl (2007–2009)
  { id:'dp1', universe:'pokemon', name:'Diamond & Pearl', code:'DP', date:'2007-05', cards:130, type:'vintage' },
  { id:'dp2', universe:'pokemon', name:'Mysterious Treasures', code:'MT', date:'2007-08', cards:124, type:'vintage' },
  { id:'dp3', universe:'pokemon', name:'Secret Wonders', code:'SW', date:'2007-11', cards:132, type:'vintage' },
  { id:'dp4', universe:'pokemon', name:'Great Encounters', code:'GE', date:'2008-02', cards:106, type:'vintage' },
  { id:'dp5', universe:'pokemon', name:'Majestic Dawn', code:'MD', date:'2008-05', cards:100, type:'vintage' },
  { id:'dp6', universe:'pokemon', name:'Legends Awakened', code:'LA', date:'2008-08', cards:146, type:'vintage' },
  { id:'dp7', universe:'pokemon', name:'Stormfront', code:'SF', date:'2008-11', cards:106, type:'vintage' },
  { id:'pl1', universe:'pokemon', name:'Platinum', code:'PL', date:'2009-02', cards:127, type:'vintage' },
  { id:'pl2', universe:'pokemon', name:'Rising Rivals', code:'RR', date:'2009-05', cards:111, type:'vintage' },
  { id:'pl3', universe:'pokemon', name:'Supreme Victors', code:'SV', date:'2009-08', cards:147, type:'vintage' },
  { id:'pl4', universe:'pokemon', name:'Arceus', code:'AR', date:'2009-11', cards:111, type:'vintage' },
  // HeartGold SoulSilver (2010–2011)
  { id:'hg1', universe:'pokemon', name:'HeartGold & SoulSilver', code:'HS', date:'2010-02', cards:123, type:'vintage' },
  { id:'hg2', universe:'pokemon', name:'Unleashed', code:'UL', date:'2010-05', cards:95, type:'vintage' },
  { id:'hg3', universe:'pokemon', name:'Undaunted', code:'UD', date:'2010-08', cards:90, type:'vintage' },
  { id:'hg4', universe:'pokemon', name:'Triumphant', code:'TM', date:'2010-11', cards:102, type:'vintage' },
  { id:'cl', universe:'pokemon', name:'Call of Legends', code:'CL', date:'2011-02', cards:95, type:'vintage' },
  // Black & White (2011–2013)
  { id:'bw1', universe:'pokemon', name:'Black & White', code:'BW', date:'2011-04', cards:114, type:'main' },
  { id:'bw2', universe:'pokemon', name:'Emerging Powers', code:'EP', date:'2011-08', cards:98, type:'main' },
  { id:'bw3', universe:'pokemon', name:'Noble Victories', code:'NV', date:'2011-11', cards:101, type:'main' },
  { id:'bw4', universe:'pokemon', name:'Next Destinies', code:'ND', date:'2012-02', cards:99, type:'main' },
  { id:'bw5', universe:'pokemon', name:'Dark Explorers', code:'DE', date:'2012-05', cards:108, type:'main' },
  { id:'bw6', universe:'pokemon', name:'Dragons Exalted', code:'DRX', date:'2012-08', cards:124, type:'main' },
  { id:'bw7', universe:'pokemon', name:'Boundaries Crossed', code:'BC', date:'2012-11', cards:149, type:'main' },
  { id:'bw8', universe:'pokemon', name:'Plasma Storm', code:'PS', date:'2013-02', cards:138, type:'main' },
  { id:'bw9', universe:'pokemon', name:'Plasma Freeze', code:'PF', date:'2013-05', cards:116, type:'main' },
  { id:'bw10', universe:'pokemon', name:'Plasma Blast', code:'PB', date:'2013-08', cards:101, type:'main' },
  { id:'bw11', universe:'pokemon', name:'Legendary Treasures', code:'LT', date:'2013-11', cards:113, type:'main' },
  // XY Series (2014–2016)
  { id:'xy1', universe:'pokemon', name:'XY', code:'XY', date:'2014-02', cards:146, type:'main' },
  { id:'xy2', universe:'pokemon', name:'Flashfire', code:'FLF', date:'2014-05', cards:106, type:'main' },
  { id:'xy3', universe:'pokemon', name:'Furious Fists', code:'FFI', date:'2014-08', cards:111, type:'main' },
  { id:'xy4', universe:'pokemon', name:'Phantom Forces', code:'PHF', date:'2014-11', cards:119, type:'main' },
  { id:'xy5', universe:'pokemon', name:'Primal Clash', code:'PRC', date:'2015-02', cards:164, type:'main' },
  { id:'xy6', universe:'pokemon', name:'Roaring Skies', code:'ROS', date:'2015-05', cards:108, type:'main' },
  { id:'xy7', universe:'pokemon', name:'Ancient Origins', code:'AOR', date:'2015-08', cards:100, type:'main' },
  { id:'xy8', universe:'pokemon', name:'BREAKthrough', code:'BKT', date:'2015-11', cards:162, type:'main' },
  { id:'xy9', universe:'pokemon', name:'BREAKpoint', code:'BKP', date:'2016-02', cards:122, type:'main' },
  { id:'gen', universe:'pokemon', name:'Generations', code:'GEN', date:'2016-02', cards:115, type:'special' },
  { id:'xy10', universe:'pokemon', name:'Fates Collide', code:'FCO', date:'2016-05', cards:125, type:'main' },
  { id:'xy11', universe:'pokemon', name:'Steam Siege', code:'STS', date:'2016-08', cards:114, type:'main' },
  { id:'xy12', universe:'pokemon', name:'Evolutions', code:'EVO', date:'2016-11', cards:113, type:'main' },
  // Sun & Moon (2017–2019)
  { id:'sm1', universe:'pokemon', name:'Sun & Moon', code:'SUM', date:'2017-02', cards:149, type:'main' },
  { id:'sm2', universe:'pokemon', name:'Guardians Rising', code:'GRI', date:'2017-05', cards:145, type:'main' },
  { id:'sm3', universe:'pokemon', name:'Burning Shadows', code:'BUS', date:'2017-08', cards:147, type:'main' },
  { id:'sm3a', universe:'pokemon', name:'Shining Legends', code:'SLG', date:'2017-10', cards:73, type:'special' },
  { id:'sm4', universe:'pokemon', name:'Crimson Invasion', code:'CIN', date:'2017-11', cards:111, type:'main' },
  { id:'sm5', universe:'pokemon', name:'Ultra Prism', code:'UPR', date:'2018-02', cards:156, type:'main' },
  { id:'sm6', universe:'pokemon', name:'Forbidden Light', code:'FLI', date:'2018-05', cards:131, type:'main' },
  { id:'sm7', universe:'pokemon', name:'Celestial Storm', code:'CES', date:'2018-08', cards:168, type:'main' },
  { id:'sm7a', universe:'pokemon', name:'Dragon Majesty', code:'DRM', date:'2018-09', cards:70, type:'special' },
  { id:'sm8', universe:'pokemon', name:'Lost Thunder', code:'LOT', date:'2018-11', cards:214, type:'main' },
  { id:'sm9', universe:'pokemon', name:'Team Up', code:'TEU', date:'2019-02', cards:181, type:'main' },
  { id:'sm9a', universe:'pokemon', name:'Detective Pikachu', code:'DET', date:'2019-04', cards:18, type:'special' },
  { id:'sm10', universe:'pokemon', name:'Unbroken Bonds', code:'UNB', date:'2019-05', cards:214, type:'main' },
  { id:'sm11', universe:'pokemon', name:'Unified Minds', code:'UNM', date:'2019-08', cards:236, type:'main' },
  { id:'hif', universe:'pokemon', name:'Hidden Fates', code:'HIF', date:'2019-08', cards:69, type:'special' },
  { id:'sm12', universe:'pokemon', name:'Cosmic Eclipse', code:'CEC', date:'2019-11', cards:271, type:'main' },
  // Sword & Shield (2020–2023)
  { id:'swsh1', universe:'pokemon', name:'Sword & Shield', code:'SSH', date:'2020-02', cards:202, type:'main' },
  { id:'swsh2', universe:'pokemon', name:'Rebel Clash', code:'RCL', date:'2020-05', cards:192, type:'main' },
  { id:'swsh3', universe:'pokemon', name:'Darkness Ablaze', code:'DAA', date:'2020-08', cards:189, type:'main' },
  { id:'cpa', universe:'pokemon', name:"Champion's Path", code:'CPA', date:'2020-09', cards:73, type:'special' },
  { id:'swsh4', universe:'pokemon', name:'Vivid Voltage', code:'VIV', date:'2020-11', cards:185, type:'main' },
  { id:'shf', universe:'pokemon', name:'Shining Fates', code:'SHF', date:'2021-02', cards:73, type:'special' },
  { id:'swsh5', universe:'pokemon', name:'Battle Styles', code:'BST', date:'2021-03', cards:163, type:'main' },
  { id:'swsh6', universe:'pokemon', name:'Chilling Reign', code:'CRE', date:'2021-06', cards:198, type:'main' },
  { id:'swsh7', universe:'pokemon', name:'Evolving Skies', code:'EVS', date:'2021-08', cards:203, type:'main' },
  { id:'cel25', universe:'pokemon', name:'Celebrations', code:'CEL', date:'2021-10', cards:50, type:'special' },
  { id:'swsh8', universe:'pokemon', name:'Fusion Strike', code:'FST', date:'2021-11', cards:264, type:'main' },
  { id:'swsh9', universe:'pokemon', name:'Brilliant Stars', code:'BRS', date:'2022-02', cards:172, type:'main' },
  { id:'swsh10', universe:'pokemon', name:'Astral Radiance', code:'ASR', date:'2022-05', cards:189, type:'main' },
  { id:'pgo', universe:'pokemon', name:'Pokémon GO', code:'PGO', date:'2022-07', cards:88, type:'special' },
  { id:'swsh11', universe:'pokemon', name:'Lost Origin', code:'LOR', date:'2022-09', cards:196, type:'main' },
  { id:'swsh12', universe:'pokemon', name:'Silver Tempest', code:'SIT', date:'2022-11', cards:195, type:'main' },
  { id:'cz', universe:'pokemon', name:'Crown Zenith', code:'CRZ', date:'2023-01', cards:160, type:'special' },
  // Scarlet & Violet (2023–2026)
  { id:'sv1', universe:'pokemon', name:'Scarlet & Violet', code:'SV01', date:'2023-04', cards:198, type:'main' },
  { id:'sv1a', universe:'pokemon', name:'Pokémon Card 151', code:'MEW', date:'2023-09', cards:165, type:'special' },
  { id:'sv2', universe:'pokemon', name:'Paldea Evolved', code:'SV02', date:'2023-06', cards:193, type:'main' },
  { id:'sv3', universe:'pokemon', name:'Obsidian Flames', code:'SV03', date:'2023-08', cards:197, type:'main' },
  { id:'sv4', universe:'pokemon', name:'Paradox Rift', code:'SV04', date:'2023-11', cards:182, type:'main' },
  { id:'sv4a', universe:'pokemon', name:'Paldean Fates', code:'SV4.5', date:'2024-01', cards:91, type:'special' },
  { id:'sv5', universe:'pokemon', name:'Temporal Forces', code:'SV05', date:'2024-03', cards:162, type:'main' },
  { id:'sv6', universe:'pokemon', name:'Twilight Masquerade', code:'SV06', date:'2024-05', cards:167, type:'main' },
  { id:'sv6a', universe:'pokemon', name:'Shrouded Fable', code:'SV6.5', date:'2024-08', cards:99, type:'special' },
  { id:'sv7', universe:'pokemon', name:'Stellar Crown', code:'SV07', date:'2024-09', cards:175, type:'main' },
  { id:'sv8', universe:'pokemon', name:'Surging Sparks', code:'SV08', date:'2024-11', cards:191, type:'main' },
  { id:'sv8a', universe:'pokemon', name:'Prismatic Evolutions', code:'SV8.5', date:'2025-01', cards:131, type:'special' },
  { id:'sv9', universe:'pokemon', name:'Journey Together', code:'SV09', date:'2025-03', cards:190, type:'main' },
  { id:'sv9a', universe:'pokemon', name:'Destined Rivals', code:'SV9.5', date:'2025-06', cards:175, type:'main' },
  { id:'sv10', universe:'pokemon', name:'Surreal Bonds', code:'SV10', date:'2025-09', cards:195, type:'main' },
  { id:'sv11', universe:'pokemon', name:'Legends: Z-A', code:'SV11', date:'2025-11', cards:190, type:'main' },
  { id:'pfo', universe:'pokemon', name:'Perfect Order', code:'PFO', date:'2026-03', cards:124, type:'main' },
  { id:'emeg', universe:'pokemon', name:'Energie Mega Evolution', series:'Mega Evolution', code:'EMEG', date:'2016-04', cards:8, type:'special' },
  // Pokémon TCG — 93 sets • Base Set (1999) → Perfect Order (2026)
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
  { id:'s12', universe:'pokemon', name:'Booster Box — Perfect Order', type:'booster_box', emoji:'📦', retail:185, mkt:195, t6:[0,0,0,0,230,195], note:'Premier set Legends Z-A — Mega Zygarde ex chase card.' },
];
