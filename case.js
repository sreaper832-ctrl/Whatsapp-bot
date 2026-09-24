

require('../config/setting/config');
const {
    default: baileys,
    getContentType,
    downloadContentFromMessage
} = require("@whiskeysockets/baileys");

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const chalk = require('chalk');
const moment = require('moment-timezone');
const { getSetting, setSetting } = require("../config/setting/Settings.js");
const { toAudio, toPTT } = require('../lib/converter.js');
const { addExif } = require('../utils/exif.js');
const yts = require('yt-search');
const startpairing = require('./pair');
const APIs = require('./api');
const { executeRichGame } = require('../commands/richgames');
const { runCommand: runCustomCommand, listCommands: listCustomCommands } = require('../lib/commandLoader');
const { STORAGE_DIR, DATABASE_FILE } = require('../lib/paths');
const { getSenderIds, sameIdentity, isGroupAdmin } = require('../lib/identity');

// ========== GLOBALS ==========
global.packname = '𝐕𝐈𝐂𝐎 𝐗𝐌𝐃';
global.OWNER_NAME = '𝐌𝐑 𝐑𝐌𝐒 𓉳';
global.botName = '𝐕𝐈𝐂𝐎 𝐗𝐌𝐃 𓉳';

// ========== NEWSLETTER CONTEXT ==========
global.newsletterJid = '120363424620719844@newsletter';
global.newsletterName = '𝐑𝐌𝐒 𝐓𝐄𝐂𝐇 𓉳';

// ========== NEWSLETTER CONTEXT FUNCTION ==========
function newsletterContext(extra = {}) {
    if (!global.newsletterJid) return extra;
    return {
        ...extra,
        forwardingScore: 999,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
            newsletterJid: global.newsletterJid,
            newsletterName: global.newsletterName || global.botName || '𝐕𝐈𝐂𝐎 𝐗𝐌𝐃 𓉳',
            serverMessageId: 143
        }
    };
}
// ========== AUTO REACT ==========
let autoMessageReact = false;
const processedMessages = new Set();
const miniGameState = new Map();
// Auto-cleanup to prevent memory leak (fixes leak)
setInterval(() => { if (processedMessages.size > 5000) processedMessages.clear(); }, 1000*60*30);
setInterval(() => { if (miniGameState.size > 1000) { const now = Date.now(); for (const [k,v] of miniGameState) { if (now - (v.lastActive||0) > 1000*60*30) miniGameState.delete(k); } } }, 1000*60*10);



// ===== COPY FROM HERE - TOP DATA BANKS WITH EXACT COUNTS =====
const planetsData = [
{name:"Mercury",desc:"Smallest planet, no atmosphere. Temps -180C to 430C. You are fast and adapt quickly."},
{name:"Venus",desc:"Hottest planet, thick CO2 clouds, 90x pressure. You are beautiful but dangerous."},
{name:"Earth",desc:"Only planet with life, 71% water. You are balanced and full of life."},
{name:"Mars",desc:"Red planet, Olympus Mons biggest volcano. You are adventurous and bold."},
{name:"Jupiter",desc:"Giant gas king, Great Red Spot 400 years. You are big and protective."},
{name:"Saturn",desc:"Ringed beauty of ice and rock. You are stylish and unique."},
{name:"Uranus",desc:"Sideways ice giant, rotates on side. You are weird but cool."},
{name:"Neptune",desc:"Deep blue, 1200mph winds. You are mysterious and deep."},
{name:"Pluto",desc:"Dwarf but big heart. You are underestimated but loved."},
{name:"Kepler-452b",desc:"Earth's cousin 1400 light years away. You are hopeful dreamer."},
{name:"Proxima b",desc:"Closest exoplanet 4.2 light years. You are close to success."},
{name:"TRAPPIST-1e",desc:"Possibly habitable, 39 light years. You have potential."},
{name:"Kepler-22b",desc:"First habitable zone planet found. You are pioneer."},
{name:"Gliese 667Cc",desc:"Super-Earth 22 light years. Stronger than you look."},
{name:"HD 209458b",desc:"Osiris evaporating atmosphere. You are dramatic."},
{name:"51 Eridani b",desc:"Young Jupiter-like 96 light years. You are young and fresh."},
{name:"WASP-12b",desc:"Hot Jupiter being eaten by star. You give too much."},
{name:"Kepler-10b",desc:"Lava world iron planet. You are tough and unbreakable."},
{name:"Tatooine",desc:"Star Wars twin suns desert. You are legendary."},
{name:"Pandora",desc:"Avatar moon glowing jungle. You are magical."},
{name:"Krypton",desc:"Superman home strong gravity. You are super powerful."},
{name:"Namek",desc:"Dragon Ball green planet wise people. You are wise."},
{name:"Arrakis",desc:"Dune desert spice planet. You are valuable and dangerous."},
{name:"Coruscant",desc:"City planet Star Wars capital. You are busy important."},
{name:"Cybertron",desc:"Transformers metal planet. You are smart mechanical."},
{name:"Gallifrey",desc:"Doctor Who time lord home. You are timeless ancient."},
{name:"Vulcan",desc:"Star Trek logical planet. You are logical smart."},
{name:"Ego",desc:"Living planet Guardians. You are self-made."},
{name:"Titan",desc:"Saturn moon with lakes like Earth. Similar but different."},
{name:"Europa",desc:"Jupiter icy moon with ocean. You hide deep secrets."},
];

const galaxiesData = [
"Andromeda Galaxy - Closest spiral 2.5M light years, will collide with us. You are destined for greatness.",
"Milky Way Galaxy - Our home 100B stars 100k light years. You are home to many.",
"Triangulum Galaxy - Third largest in Local Group. You are humble but important.",
"Whirlpool Galaxy - Perfect spiral interacting. You are beautiful and social.",
"Sombrero Galaxy - Hat shaped bright core. You are stylish and bright.",
"Black Eye Galaxy - Dark dust band. You have dark past but mysterious.",
"Pinwheel Galaxy - Face-on spiral huge. You are open big hearted.",
"Cartwheel Galaxy - Ring shape from collision. You survived trauma.",
"Tadpole Galaxy - Long tail 280k light years. You leave impact.",
"Sunflower Galaxy - Flocculent spiral. You are gentle calm.",
"Messier 87 Galaxy - Giant elliptical black hole photo. You are powerful heavy.",
"Cigar Galaxy - Starburst forming stars fast. You are energetic.",
"Bode's Galaxy - Bright spiral near Big Dipper. Easy to love.",
"Circinus Galaxy - Seyfert with black hole. You hide power inside.",
"Comet Galaxy - 3.2B light years 6000 light year tail. You move fast.",
"Hoag's Object - Perfect ring galaxy rare. You are rare perfect.",
"Condor Galaxy - Largest spiral known. Larger than life.",
"Mayall's Object - Two colliding galaxies. Combination of two souls.",
"Antennae Galaxies - Two colliding forming new stars. You create from chaos.",
"Butterfly Galaxies - Colliding pair. You are transforming.",
"Mice Galaxies - Long tails like mice. You are playful.",
"Eyes Galaxies - Two galaxies like eyes. You watch everything.",
"Rose Galaxies - Rose shaped interacting. You are romantic.",
"Hockey Stick Galaxy - Warped spiral. Bent but not broken.",
"Needle Galaxy - Edge-on thin spiral. Sharp and focused.",
"Silver Dollar Galaxy - Bright round. Rich and valuable.",
"Sculptor Galaxy - Starburst spiral. You are creative.",
"Centaurus A Galaxy - Elliptical with dust lane. Mixed and unique.",
"Messier 82 Galaxy - Most active star forming. Super active.",
"Fireworks Galaxy - Lots of supernovas. Explosive and fun.",
];

const bibleQuotes = [
"Philippians 4:13 - I can do all things through Christ who strengthens me.",
"Jeremiah 29:11 - For I know the plans I have for you, declares the Lord.",
"Isaiah 41:10 - Fear not, for I am with you; be not dismayed.",
"Romans 8:28 - All things work together for good for those who love God.",
"Psalm 23:1 - The Lord is my shepherd; I shall not want.",
"Joshua 1:9 - Be strong and courageous. Do not be afraid.",
"Proverbs 3:5-6 - Trust in the Lord with all your heart.",
"2 Corinthians 12:9 - My grace is sufficient for you.",
"Psalm 46:1 - God is our refuge and strength.",
"Romans 8:31 - If God is for us, who can be against us?",
"John 3:16 - For God so loved the world He gave His only Son.",
"Isaiah 40:31 - Those who wait on the Lord shall renew their strength.",
"Philippians 4:6 - Be anxious for nothing, but in everything by prayer.",
"Psalm 27:1 - The Lord is my light and my salvation.",
"Matthew 11:28 - Come to me all who are weary and I will give you rest.",
"Deuteronomy 31:6 - Be strong and courageous, the Lord goes with you.",
"Romans 15:13 - May the God of hope fill you with joy and peace.",
"Psalm 34:8 - Taste and see that the Lord is good.",
"2 Timothy 1:7 - God has not given us a spirit of fear.",
"Isaiah 43:2 - When you pass through waters, I will be with you.",
"Psalm 37:4 - Delight yourself in the Lord and He will give you desires.",
"Matthew 6:33 - Seek first His kingdom and all will be added.",
"Psalm 46:10 - Be still and know that I am God.",
"Proverbs 18:10 - The name of the Lord is a strong tower.",
"John 14:27 - Peace I leave with you, My peace I give to you.",
"Psalm 121:2 - My help comes from the Lord.",
"Isaiah 54:17 - No weapon formed against you shall prosper.",
"Romans 12:2 - Be transformed by renewing of your mind.",
"Psalm 118:24 - This is the day the Lord has made, rejoice.",
"Jeremiah 33:3 - Call to Me and I will answer you.",
"Matthew 19:26 - With God all things are possible.",
"Psalm 56:3 - When I am afraid, I put my trust in You.",
"Isaiah 26:3 - You will keep in perfect peace whose mind is steadfast.",
"1 Peter 5:7 - Cast all your anxiety on Him because He cares.",
"Psalm 62:1 - My soul finds rest in God alone.",
"John 16:33 - In world you will have trouble. But take heart! I have overcome.",
"Romans 5:8 - God demonstrates His love for us while we were still sinners.",
"Psalm 91:1 - He who dwells in shelter of Most High will rest.",
"Philippians 4:7 - And the peace of God will guard your hearts.",
"Isaiah 40:29 - He gives strength to the weary.",
"Psalm 19:14 - May words of my mouth be pleasing to You.",
"Matthew 5:9 - Blessed are the peacemakers.",
"2 Corinthians 5:7 - We live by faith, not by sight.",
"Psalm 34:17 - The righteous cry out and Lord hears them.",
"Galatians 5:22 - Fruit of Spirit is love, joy, peace.",
"Psalm 16:8 - I have set the Lord always before me.",
"Romans 10:9 - If you confess Jesus is Lord you will be saved.",
"Isaiah 12:2 - Surely God is my salvation, I will trust.",
"Psalm 139:14 - I am fearfully and wonderfully made.",
"John 8:12 - I am the light of the world.",
"Psalm 73:26 - My flesh and heart may fail, but God is strength.",
"Matthew 5:14 - You are the light of the world.",
"Isaiah 41:13 - I am Lord your God who takes hold of your right hand.",
"Psalm 18:2 - The Lord is my rock, my fortress.",
"1 Corinthians 10:13 - No temptation beyond what you can bear.",
"Psalm 27:14 - Wait for the Lord; be strong and take heart.",
"John 15:5 - I am the vine, you are the branches.",
"Isaiah 61:1 - Spirit of Lord is on me to bring good news.",
"Psalm 94:19 - When anxiety was great, Your consolation brought joy.",
"Romans 8:18 - Present sufferings not worth comparing to glory to be revealed.",
];

const quranQuotes = [
"Indeed, with hardship will be ease. Quran 94:6",
"Allah does not burden a soul beyond that it can bear. 2:286",
"So remember Me; I will remember you. 2:152",
"And He found you lost and guided you. 93:7",
"Whoever puts trust in Allah, He will suffice him. 65:3",
"And Allah is the best of planners. 3:54",
"Indeed Allah is with the patient. 2:153",
"Call upon Me, I will respond to you. 40:60",
"And Allah loves those who do good. 2:195",
"Indeed, Allah forgives all sins. 39:53",
"And whoever fears Allah, He will make a way out. 65:2",
"So verily, with every difficulty there is relief. 94:5",
"Allah is the Light of heavens and earth. 24:35",
"And We created man in best stature. 95:4",
"Verily, in remembrance of Allah do hearts find rest. 13:28",
"And Allah would not punish them while they seek forgiveness. 8:33",
"My mercy encompasses all things. 7:156",
"Allah loves those who trust Him. 3:159",
"Do not despair of Allah's mercy. 39:53",
"And He is with you wherever you are. 57:4",
"Indeed, Allah is Forgiving and Merciful. 2:173",
"And rely upon Allah, sufficient is Allah as disposer. 33:3",
"Allah knows what is in your hearts. 33:51",
"And whoever is grateful, his gratitude is for himself. 27:40",
"Allah will bring ease after hardship. 65:7",
"So be patient, indeed Allah's promise is true. 30:60",
"Allah does not wrong people at all. 10:44",
"And Allah loves the doers of justice. 60:8",
"Indeed Allah loves those who purify themselves. 2:222",
"And Allah is ever Knowing and Wise. 4:26",
"Verily, Allah loves those who rely on Him. 3:159",
"And Allah will not waste reward of doers of good. 12:56",
"Allah is sufficient as a witness. 48:28",
"And Allah is ever Merciful to believers. 33:43",
"Indeed Allah is Gentle and Merciful. 22:65",
"And Allah guides whom He wills to straight path. 2:213",
"Allah is the Protector of those who believe. 2:257",
"And Allah is All-Hearing, All-Knowing. 2:181",
"So seek forgiveness and He will send rain. 71:10",
"Allah loves those who are constantly repentant. 2:222",
"And Allah is the best of providers. 62:11",
"Indeed, Allah's help is near. 2:214",
"And Allah is swift in account. 2:202",
"Allah will not change condition until they change themselves. 13:11",
"And Allah loves the patient. 3:146",
"Verily, Allah is with those who fear Him. 16:128",
"And Allah is Ever-Living, does not die. 25:58",
"Allah created death and life to test you. 67:2",
"And Allah is the best to take care. 12:64",
"Indeed, Allah's mercy is near to doers of good. 7:56",
"And Allah is All-Powerful over everything. 2:284",
"Allah will exalt those who believe. 58:11",
"And Allah is the One who gives life and causes death. 44:8",
"Indeed, Allah is All-Forgiving, Most Merciful. 39:53",
"And Allah loves those who are fair. 49:9",
"Allah is the Creator of all things. 39:62",
"And Allah is ever Appreciative and Knowing. 64:17",
"Indeed, Allah does not like the arrogant. 16:23",
"And Allah guides to His Light whom He wills. 24:35",
"Allah is the Truth and His promise is truth. 31:30",
];

const advices = [
"Don't chase people. Be yourself and your people will find you.",
"Take care of your body, it's the only place you have to live.",
"Learn to say NO without explaining yourself.",
"Invest in yourself, it pays the best interest.",
"Consistency beats motivation every time.",
"Your mental health is more important than any job.",
"Stop comparing your life to others' highlight reels.",
"Learn to be alone, it makes you stronger.",
"Don't be afraid to start over, it's a chance to build better.",
"Kindness is free, sprinkle it everywhere.",
"Save 20% of everything you earn.",
"Read 10 pages everyday, it changes your brain.",
"Never beg for love, respect or attention.",
"Time heals almost everything, give it time.",
"Don't take criticism from someone you wouldn't take advice from.",
"Wake up early, you get more life.",
"Forgive but never forget the lesson.",
"Be the energy you want to attract.",
"Your future needs you, your past doesn't.",
"Don't tell people your plans, show them your results.",
"Learn a high income skill every 6 months.",
"Family is not always blood, it's who is there for you.",
"Don't argue with fools, people may not see difference.",
"Take risks while you are young.",
"Listen more than you talk.",
"Don't trust words, trust actions.",
"Keep your circle small and private.",
"Never sacrifice your peace for anyone.",
"Discipline is choosing between what you want now and what you want most.",
"Help others even when you are struggling.",
"Don't gossip, it says more about you than them.",
"Embrace failure, it's a teacher.",
"Never go back to what broke you.",
"Your phone is stealing your dreams, limit it.",
"Be patient, good things take time.",
"Don't fear change, fear staying same.",
"Learn to love the process, not just result.",
"Make your parents proud before they are gone.",
"Pray, even when you don't feel like it.",
"Don't let social media define your worth.",
"Take care of your environment, it takes care of you.",
"Learn to apologize sincerely.",
"Don't be jealous, be inspired.",
"Celebrate small wins.",
"Never stop learning, life never stops teaching.",
"Control your emotions or they will control you.",
"Be loyal to those who are loyal to you.",
"Don't lend money you can't afford to lose.",
"Travel when you can, money returns, time doesn't.",
"Be careful who you trust, salt and sugar look same.",
"Don't be available all the time, have boundaries.",
"Your attitude determines your direction.",
"Work hard in silence, let success make noise.",
"Don't worry about what you can't control.",
"Learn to cook, it saves money and is attractive.",
"Dress well, people judge by appearance first.",
"Keep promises, especially to yourself.",
"Don't make permanent decisions on temporary emotions.",
"Learn to manage money, school won't teach you.",
"Be grateful daily, it changes everything.",
"Don't be a people pleaser, you will lose yourself.",
"Take responsibility for your life, no more blaming.",
"Learn to listen to your gut feeling.",
"Don't be afraid to be different, original is valuable.",
"Focus on one thing at a time for better results.",
"Learn to let go of what no longer serves you.",
"Your character is who you are when no one watches.",
"Don't complain, work harder.",
"Be kind to yourself, you are doing your best.",
"Learn to sell, everything is selling.",
"Don't watch news too much, it's negative.",
"Surround yourself with people better than you.",
"Don't waste energy on revenge, move on.",
"Take photos but live in moment too.",
"Learn to say I love you more often.",
"Don't be lazy, laziness kills dreams.",
"Be proactive not reactive.",
"Learn to fix basic things yourself.",
"Don't overshare, privacy is power.",
"Be optimistic, it makes life better.",
"Learn to rest, not to quit.",
];

const mathFacts = [
"Zero is the only number that cannot be represented in Roman numerals.",
"A googol is 10^100, but googolplex is 10^googol bigger than atoms in universe.",
"111,111,111 x 111,111,111 = 12,345,678,987,654,321",
"0.999... is exactly equal to 1, not almost 1.",
"There are more possible chess games than atoms in observable universe.",
"12+3-4+5+67+8+9 = 100 and uses numbers 1-9 in order.",
"Number 8 turned 90 degrees is infinity symbol.",
"Every odd number has an 'e' in its English spelling.",
"4 is only number spelled with same letters as its value (four).",
"13 unlucky because 13 people at Last Supper before Jesus betrayal.",
"Number 9 magic: Multiply any number by 9, sum digits = 9.",
"A circle has infinite lines of symmetry.",
"Pythagoras theorem has 370+ different proofs.",
"From 0 to 1000, letter 'a' appears first in one thousand.",
"40 is only number with letters in alphabetical order - forty.",
"One is only number with letters in reverse alphabetical order.",
"Abacus is still used and faster than calculator for some.",
"2 and 5 are only primes ending in 2 and 5.",
"7 is most common favourite number in world.",
"6 is smallest perfect number: divisors 1+2+3 = 6.",
"1729 is Hardy-Ramanujan number: smallest sum of 2 cubes in 2 ways.",
"Fibonacci sequence appears in sunflower, pinecones, galaxies.",
"Pi has been calculated to 100 trillion digits.",
"Zero invented in India, crucial for mathematics.",
"In a group of 23 people, 50% chance 2 share birthday.",
"Sum of angles in triangle always 180 degrees.",
"10! seconds = 6 weeks exactly: 3,628,800 seconds.",
"Binary: computer only uses 0 and 1.",
"A jiffy is actual time unit: 1/100th of second.",
"If you shuffle cards properly, order has likely never existed before.",
"Math is only subject where truth is absolute.",
"Infinity comes in different sizes - countable vs uncountable.",
"Multiplying 1089 x 9 = 9801 reverse of 1089.",
"Every even number >2 is sum of 2 primes - Goldbach conjecture.",
"Equal sign = invented 1557 by Robert Recorde tired of writing 'is equal to'.",
"Negative numbers were once called absurd numbers.",
"Google named from googol mispelling.",
"2 to power 0 is 1, any number power 0 is 1.",
"Ancient Egyptians used fractions only like 1/n.",
"Centipede has not 100 legs, can have 30 to 354 legs.",
];

const scienceFacts = [
"Water can boil and freeze at same time at 0.01C - Triple Point.",
"Light from Sun takes 8 minutes 20 seconds to reach Earth.",
"Honey never spoils, 3000 year old honey found edible.",
"Octopus has 3 hearts and 9 brains.",
"Banana is radioactive, contains potassium-40.",
"A day on Venus is longer than a year on Venus.",
"There is planet made of diamonds 2x size of Earth - 55 Cancri e.",
"Humans share 60% DNA with bananas.",
"Your stomach gets new lining every 3-4 days.",
"Eiffel Tower grows 6 inches in summer due to heat expansion.",
"Nose can smell 1 trillion different scents.",
"Space smells like seared steak and gunpowder.",
"Wombats poop cubes to mark territory.",
"Lightning is 5x hotter than surface of Sun - 30000K.",
"There are more trees on Earth than stars in Milky Way.",
"Your brain generates 20 watts power enough for dim bulb.",
"Cows have best friends and get stressed when separated.",
"Ocean has 200x more gold than mined in history.",
"Venus has 900F and rains sulfuric acid.",
"Human body has enough iron to make 3 inch nail.",
"Ants never sleep, but take 8 min rests.",
"Sun makes up 99.86% of solar system mass.",
"If you drill tunnel through Earth, 42 min to fall other side.",
"Blood makes up 8% of body weight.",
"Chewing gum after onion prevents crying.",
"Space is silent, no sound can travel.",
"Your eyes blink 28800 times a day.",
"Butterflies taste with their feet.",
"Sharks existed before trees - 400M vs 350M years.",
"Human DNA is 99% same as chimpanzee.",
"Light can be turned into matter - Breit-Wheeler.",
"Earth's core is as hot as Sun surface - 6000C.",
"Clouds can weigh million pounds but float.",
"You can't burp in space, no gravity.",
"Moon has moonquakes like earthquakes.",
"Human body glows but eyes can't see.",
"DNA can be stored for 1M years if kept cold.",
"An atom is 99.9999% empty space.",
"Sound travels 4x faster in water than air.",
"Human nose can detect 1 trillion smells but dog 1000x more.",
];

const xdeathLinks = [
  "https://files.catbox.moe/wq4ohm.jpg",
  "https://files.catbox.moe/4fzizw.jpg"
];

const bombState = new Map();

function gameUserId(m) {
    return `${m.chat}:${m.sender}`;
}
function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
// ========== SAVE STATUS ==========
let saveStatusMode = false;

// ========== AZA DATABASE ==========
const AZA_FILE = path.join(__dirname, './aza.json');
function loadAzaDB() {
    try {
        if (fs.existsSync(AZA_FILE)) {
            return JSON.parse(fs.readFileSync(AZA_FILE, 'utf8'));
        }
    } catch (e) { console.error('AZA load error:', e.message); }
    return {};
}
function saveAzaDB(data) {
    try {
        fs.writeFileSync(AZA_FILE, JSON.stringify(data, null, 2));
    } catch (e) { console.error('AZA save error:', e.message); }
}


const MENU_IMAGE_PATH = require('path').join(__dirname, '../media/logo.jpg');
let menuImageBuffer = null;
try {
    if (fs.existsSync(MENU_IMAGE_PATH)) {
        menuImageBuffer = fs.readFileSync(MENU_IMAGE_PATH);
    }
} catch (e) {}
global.menuImage = menuImageBuffer || 'https://files.catbox.moe/s7kl0m.jpg';

// ========== DATABASE ==========
const dbPath = DATABASE_FILE;
const legacyDbPath = path.join(process.cwd(), 'database.json');
let db;
try {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
    const source = fs.existsSync(dbPath) ? dbPath : (fs.existsSync(legacyDbPath) ? legacyDbPath : null);
    db = source ? JSON.parse(fs.readFileSync(source, 'utf8')) : null;
    if (!db || typeof db !== 'object') throw new Error('Invalid database');
    if (!fs.existsSync(dbPath)) fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
} catch (err) {
    db = { users: {}, groups: {}, warns: {}, economy: {}, jailed: {}, botMode: { mode: 'public', whitelist: [] } };
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
}
if (!db.economy) db.economy = {};
if (!db.botMode) db.botMode = { mode: 'public', whitelist: [] };
if (!db.botMode.whitelist) db.botMode.whitelist = [];
if (!db.jailed) db.jailed = {};
if (!db.warns) db.warns = {};

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

let GoogleGenerativeAI;
try {
    const genAI = require('@google/generative-ai');
    GoogleGenerativeAI = genAI.GoogleGenerativeAI;
} catch (e) {}

// ========== AGENTROUTER (agentrouter.org) ==========
// Get your key from https://agentrouter.org/console/token and paste it below.
// Leave it as '' to skip AgentRouter and fall back straight to the free mirror APIs.
const AGENTROUTER_API_KEY = process.env.AGENTROUTER_API_KEY || '';
const AGENTROUTER_BASE_URL = 'https://agentrouter.org/v1';
const AGENTROUTER_CHAT_MODEL = 'claude-3-5-haiku-20241022';
const AGENTROUTER_DEEPSEEK_MODEL = 'deepseek-chat';

// Calls AgentRouter's OpenAI-compatible /chat/completions endpoint.
// Returns the reply text, or null if the key isn't set / the call fails.
async function askAgentRouter(prompt, model = AGENTROUTER_CHAT_MODEL) {
    if (!AGENTROUTER_API_KEY) return null;
    try {
        const res = await axios.post(
            `${AGENTROUTER_BASE_URL}/chat/completions`,
            {
                model,
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 1024
            },
            {
                timeout: 30000,
                headers: {
                    Authorization: `Bearer ${AGENTROUTER_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        return res.data?.choices?.[0]?.message?.content?.trim() || null;
    } catch (e) {
        console.log('❌ AgentRouter failed:', e.response?.data?.error?.message || e.message);
        return null;
    }
}
// ========== NEKOSBEST REACTION API ==========
// 50 SFW anime/GIF reaction commands. The API requires a User-Agent.
const NEKOSBEST_BASE = 'https://nekos.best/api/v2';
const NEKOSBEST_REACTIONS = [
    'lurk','shoot','sleep','clap','shrug','stare','wave','poke','confused','smile',
    'peck','wink','sip','blush','smug','tickle','yeet','think','highfive','feed',
    'wag','bite','teehee','shocked','bleh','bored','nom','nya','yawn','facepalm',
    'cuddle','happy','carry','hug','kabedon','baka','bonk','pat','angry','spin',
    'shake','run','nod','nope','kiss','dance','punch','handshake','slap','cry','pout'
];
const NEKOSBEST_REACTION_SET = new Set(NEKOSBEST_REACTIONS);

// make sure you have this function defined somewhere
// const newsletterContext = () => ({... });

async function sendNekosBestReaction(sock, m, command, prefix, args) {
    const category = command.toLowerCase();
    if (!NEKOSBEST_REACTION_SET.has(category)) return false;

    try {
        const response = await axios.get(`${NEKOSBEST_BASE}/${encodeURIComponent(category)}`, {
            timeout: 20000,
            headers: { 'User-Agent': 'VICO-XMD/1.0 (WhatsApp bot; reaction command)' }
        });

        const result = response.data?.results?.[0];
        const mediaUrl = result?.url;
        if (!mediaUrl) throw new Error('NekosBest returned no media URL');

        const mediaRes = await axios.get(mediaUrl, {
            responseType: 'arraybuffer',
            timeout: 20000,
            headers: { 'User-Agent': 'VICO-XMD/1.0' }
        });
        let buffer = Buffer.from(mediaRes.data);

        const mentioned = Array.isArray(m.mentionedJid) ? m.mentionedJid : [];
        const target = mentioned[0] || (m.quoted?.sender || null);
        const targetText = target ? ` @${target.split('@')[0]}` : '';
        const action = category.replace(/^./, c => c.toUpperCase());

        const caption = `╭━━━〔 💫 VICO XMD 〕━━━╮\n┃ 🎭 *${action}*${targetText}\n┃ ✨ Anime Reaction\n╰━━━━━━━━━━━━━━━━━━╯`;

        // Convert GIF -> MP4 so WhatsApp plays it as an animated GIF (gifPlayback)
        const isGif = mediaUrl.toLowerCase().includes('.gif') ||
            (buffer.length > 6 && buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46);
        if (isGif) {
            try {
                const { execFile } = require('child_process');
                const tmpDir = path.join(process.cwd(), 'tmp');
                if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
                const inPath = path.join(tmpDir, `react_${Date.now()}.gif`);
                const outPath = path.join(tmpDir, `react_${Date.now()}.mp4`);
                fs.writeFileSync(inPath, buffer);
                await new Promise((resolve, reject) => {
                    execFile('ffmpeg', [
                        '-y', '-i', inPath,
                        '-movflags', 'faststart',
                        '-pix_fmt', 'yuv420p',
                        '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
                        '-c:v', 'libx264',
                        '-an',
                        outPath
                    ], { timeout: 25000 }, (err) => err ? reject(err) : resolve());
                });
                if (fs.existsSync(outPath)) {
                    buffer = fs.readFileSync(outPath);
                }
                try { fs.unlinkSync(inPath); } catch (_) {}
                try { fs.unlinkSync(outPath); } catch (_) {}
            } catch (convErr) {
                console.log('GIF convert skipped:', convErr.message);
            }
        }

        await sock.sendMessage(m.chat, {
            video: buffer,
            gifPlayback: true,
            mimetype: 'video/mp4',
            caption,
            mentions: target ? [target] : [],
            contextInfo: newsletterContext()
        }, { quoted: m });

        return true;
    } catch (error) {
        console.error(`NekosBest ${category} error:`, error.response?.data || error.message);
        await sock.sendMessage(m.chat, {
            text: `❌ *${category} reaction failed.*\nPlease try again in a moment.`,
            contextInfo: newsletterContext()
        }, { quoted: m }).catch(() => {});
        return true;
    }
}

// ========== HELPERS ==========
function saveDB() {
    try { fs.writeFileSync(dbPath, JSON.stringify(db, null, 2)); } catch (e) {}
}

function ensureEconomy(id) {
    if (!db.economy[id]) {
        db.economy[id] = { wallet: 1000, bank: 0, lastDaily: 0, inventory: [] };
    }
    return db.economy[id];
}

function fmtCoins(n) {
    return Number(n).toLocaleString('en-US');
}

const delay = (ms) => new Promise(r => setTimeout(r, ms));

// ========== API HELPERS ==========
async function getEliteProTechDownload(youtubeUrl) {
    const res = await axios.get(
        `https://eliteprotech-apis.zone.id/ytdown?url=${encodeURIComponent(youtubeUrl)}&format=mp3`,
        { timeout: 60000 }
    );
    if (res?.data?.success && res?.data?.downloadURL) {
        return { download: res.data.downloadURL, title: res.data.title };
    }
    throw new Error('Failed');
}

async function getShizoDownload(youtubeUrl) {
    const res = await axios.get(
        `https://api.shizo.top/downloader/ytmp3?apikey=shizo&url=${encodeURIComponent(youtubeUrl)}`,
        { timeout: 60000 }
    );
    if (res?.data?.status && res?.data?.result?.download) {
        return { download: res.data.result.download, title: res.data.result.title };
    }
    throw new Error('Failed');
}
// ========== ANTI-DELETE STORE ==========
const antidelete = (() => {
    const messageStore = new Map();
    const DATA_DIR = path.join(process.cwd(), 'data');
    const CONFIG_PATH = path.join(DATA_DIR, 'antidelete.json');
    const TEMP_MEDIA_DIR = path.join(process.cwd(), 'tmp');

    try {
        if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
        if (!fs.existsSync(TEMP_MEDIA_DIR)) fs.mkdirSync(TEMP_MEDIA_DIR, { recursive: true });
    } catch (err) {}

    function loadConfig() {
        try {
            if (!fs.existsSync(CONFIG_PATH)) return { enabled: false };
            return JSON.parse(fs.readFileSync(CONFIG_PATH));
        } catch { return { enabled: false }; }
    }

    function saveConfig(config) {
        try { fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2)); } catch (err) {}
    }

    async function storeMessage(sock, message) {
        try {
            const config = loadConfig();
            if (!config.enabled) return;
            if (!message.key?.id) return;
            // Skip protocol / revoke messages themselves
            if (message.message?.protocolMessage) return;

            const messageId = message.key.id;
            const sender = message.key.participant || message.participant || message.key.remoteJid || 'Unknown';
            const chat = message.key.remoteJid || 'Unknown';
            const isStatus = chat === 'status@broadcast';

            let content = '';
            let mediaType = null;

            if (message.message?.conversation) {
                content = message.message.conversation;
            } else if (message.message?.extendedTextMessage?.text) {
                content = message.message.extendedTextMessage.text;
            } else if (message.message?.imageMessage) {
                mediaType = '🖼️ Image';
                content = message.message.imageMessage.caption || '[Image]';
            } else if (message.message?.videoMessage) {
                mediaType = '🎬 Video';
                content = message.message.videoMessage.caption || '[Video]';
            } else if (message.message?.stickerMessage) {
                mediaType = '🔖 Sticker';
                content = '[Sticker]';
            } else if (message.message?.audioMessage) {
                mediaType = message.message.audioMessage.ptt ? '🎤 Voice Note' : '🔊 Audio';
                content = `[${mediaType}]`;
            } else if (message.message?.documentMessage) {
                mediaType = '📄 Document';
                content = message.message.documentMessage.fileName || '[Document]';
            } else if (message.message?.contactMessage) {
                mediaType = '👤 Contact';
                content = '[Contact]';
            } else if (message.message?.locationMessage) {
                mediaType = '📍 Location';
                content = '[Location]';
            } else {
                content = '[Unsupported / Media]';
            }

            messageStore.set(messageId, {
                content,
                mediaType,
                sender,
                chat,
                isStatus,
                fromMe: !!message.key.fromMe,
                timestamp: new Date().toISOString()
            });

            // Limit store size
            if (messageStore.size > 3000) {
                const keys = [...messageStore.keys()].slice(0, 1000);
                keys.forEach(k => messageStore.delete(k));
            }
        } catch (err) {}
    }

    async function handleRevocation(sock, revocationMessage) {
        try {
            const config = loadConfig();
            if (!config.enabled) return;

            const protocolMsg = revocationMessage.message?.protocolMessage;
            // type 0 = REVOKE (message deleted)
            if (!protocolMsg || protocolMsg.type !== 0) return;

            const messageId = protocolMsg.key?.id;
            if (!messageId) return;

            const deletedBy =
                revocationMessage.participant ||
                revocationMessage.key?.participant ||
                protocolMsg.key?.participant ||
                revocationMessage.key?.remoteJid;

            const original = messageStore.get(messageId);
            if (!original) return; // message not in store (old / never captured)

            const sender = original.sender;
            const time = new Date().toLocaleString('en-NG', { timeZone: 'Africa/Lagos' });
            const chat = original.chat || revocationMessage.key?.remoteJid;

            let text =
                `🔰 *ANTIDELETE REPORT*\n` +
                `━━━━━━━━━━━━━━━━━━━━\n` +
                `🗑️ *Deleted By:* @${(deletedBy || 'unknown').split('@')[0]}\n` +
                `👤 *Original Sender:* @${(sender || 'unknown').split('@')[0]}\n` +
                `🕒 *Time:* ${time}\n`;

            if (original.isStatus) text += `📌 *Type:* Status Update\n`;
            else if (chat?.endsWith('@g.us')) text += `👥 *Group:* ${chat}\n`;
            else text += `💬 *Chat:* Private\n`;

            if (original.mediaType) text += `📎 *Media:* ${original.mediaType}\n`;
            if (original.content) text += `\n💬 *Content:*\n${original.content}`;

            const mentions = [deletedBy, sender].filter(Boolean);

            // Send ONLY to bot owner DM (not the group)
            try {
                const ownerNumber = (sock.user?.id || '').split(':')[0] + '@s.whatsapp.net';
                if (ownerNumber) {
                    await sock.sendMessage(ownerNumber, {
                        text,
                        mentions,
                        contextInfo: newsletterContext()
                    }).catch(() => {});
                }
            } catch (_) {}

            messageStore.delete(messageId);
        } catch (err) {
            console.error('Antidelete revoke error:', err.message);
        }
    }

    async function handleCommand(sock, chatId, message, match, isCreator) {
        if (!isCreator) {
            await sock.sendMessage(chatId, { 
                text: '❌ *Only the bot owner can use this command.*',
                contextInfo: newsletterContext()
            }, { quoted: message });
            return;
        }
        const config = loadConfig();
        if (!match) {
            await sock.sendMessage(chatId, {
                text: `*ANTIDELETE SETUP*\n\n📊 *Status:* ${config.enabled ? '✅ Enabled' : '❌ Disabled'}\n\n*.antidelete on* - Enable\n*.antidelete off* - Disable`,
                contextInfo: newsletterContext()
            }, { quoted: message });
            return;
        }
        if (match === 'on') { config.enabled = true; saveConfig(config); await sock.sendMessage(chatId, { text: '*✅ Antidelete enabled*', contextInfo: newsletterContext() }, { quoted: message }); }
        else if (match === 'off') { config.enabled = false; saveConfig(config); await sock.sendMessage(chatId, { text: '*❌ Antidelete disabled*', contextInfo: newsletterContext() }, { quoted: message }); }
        else { await sock.sendMessage(chatId, { text: '*Invalid command. Use .antidelete*', contextInfo: newsletterContext() }, { quoted: message }); }
    }

    return { storeMessage, handleRevocation, handleCommand };
})();

// ========== WELCOME / GOODBYE HANDLER ==========
async function handleGroupParticipantsUpdate(empire, update, groupMetadata, botNumber) {
    try {
        const { id, participants, action } = update;
        const welcomeEnabled = getSetting(id, 'welcome', false);
        const goodbyeEnabled = getSetting(id, 'goodbye', false);

        if (action === 'add') {
            for (const p of participants) {
                if (p === botNumber) continue;
                if (welcomeEnabled) {
                    let msg = getSetting(id, 'welcomeMessage', '👋 Welcome @user to @group!');
                    msg = msg.replace('@user', `@${p.split('@')[0]}`).replace('@group', groupMetadata?.subject || 'this group');
                    await empire.sendMessage(id, { 
                        text: msg, 
                        mentions: [p],
                        contextInfo: newsletterContext()
                    });
                }
            }
        }
        if (action === 'remove' && goodbyeEnabled) {
            for (const p of participants) {
                if (p === botNumber) continue;
                let msg = getSetting(id, 'goodbyeMessage', "👋 Goodbye @user, we'll miss you!");
                msg = msg.replace('@user', `@${p.split('@')[0]}`).replace('@group', groupMetadata?.subject || 'this group');
                await empire.sendMessage(id, { 
                    text: msg, 
                    mentions: [p],
                    contextInfo: newsletterContext()
                });
            }
        }
    } catch (e) { console.error('Welcome/Goodbye error:', e); }
}

// ========== MAIN BOT ==========
const botHandler = async (sock, m, chatUpdate, store) => {
    const empire = sock;
    try {
        const body = m.message?.conversation ||
                     m.message?.extendedTextMessage?.text ||
                     m.message?.imageMessage?.caption ||
                     m.message?.videoMessage?.caption || "";

        // Prefix is stored per bot instance (keyed by the connected bot JID).
        // This prevents one paired bot from changing another paired bot's prefix.
        const botNumber = await empire.decodeJid(empire.user?.id || empire.user?.jid || '');
        const prefixSettingKey = botNumber || 'bot';
        const configuredPrefix = getSetting(prefixSettingKey, 'prefix', global.prefix || '.');
        const prefix = configuredPrefix === null ? '' : String(configuredPrefix || '.');

        // With a NULL prefix, only known commands are treated as commands so
        // ordinary messages such as "hello" are not swallowed by the handler.
        // Also strip common accidental symbols when prefix is disabled (.menu, &menu, etc).
        let workingBody = body.trim();
        if (configuredPrefix === null) {
            workingBody = workingBody.replace(/^[.!#&,]+\s*/, '').trim();
        } else if (workingBody.startsWith(prefix)) {
            workingBody = workingBody.slice(prefix.length).trim();
        }
        const rawBody = workingBody;
        const args = rawBody.split(/ +/).filter(Boolean);
        const command = (args.shift() || '').toLowerCase();
        const text = args.join(" ");
        const q = text; // Now all commands using 'q' will work

        const legacyCommandNames = (() => {
            if (global.__vicoLegacyCommandNames) return global.__vicoLegacyCommandNames;
            const names = new Set();
            try {
                const source = fs.readFileSync(__filename, 'utf8');
                for (const match of source.matchAll(/\bcase\s+['"]([^'"]+)['"]\s*:/g)) names.add(String(match[1]).toLowerCase());
            } catch (_) {}
            global.__vicoLegacyCommandNames = names;
            return names;
        })();
        const isCmd = configuredPrefix === null
            ? (legacyCommandNames.has(command) || listCustomCommands().includes(command))
            : body.trim().startsWith(prefix);
        let owner = [];
        try { owner = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'utils', 'owner.json'), 'utf8')); } catch (_) {}
        if (!Array.isArray(owner)) owner = [owner].filter(Boolean);

        const senderIds = getSenderIds(m, empire);
        const senderPn = m.sender || senderIds[0] || '';
        const ownerIds = [botNumber, ...(owner || []), global.creator, ...(global.owner || [])].filter(Boolean);
        const isCreator = senderIds.some(id => ownerIds.some(ownerId => sameIdentity(id, ownerId)));


        const isGroup = m.isGroup;
        let groupMetadata, participants = [], groupAdmins = [], isBotAdmins = false, isAdmins = false, groupName = "";

        if (isGroup) {
            groupMetadata = await empire.groupMetadata(m.chat).catch(() => null);
            participants = groupMetadata?.participants || [];
            groupAdmins = participants.filter(p => p.admin).map(p => p.id);
            isBotAdmins = isGroupAdmin(groupMetadata, [botNumber, empire.user?.lid]);
            isAdmins = isGroupAdmin(groupMetadata, senderIds);
            groupName = groupMetadata?.subject || "";
        }

        const reply = (teks) => empire.sendMessage(m.chat, { 
            text: teks, 
            contextInfo: newsletterContext()
        }, { quoted: m });

       
        // ─── BOT MODE CHECK ───
if (db.botMode?.mode === 'private' && !isCreator) {
    const isWhitelisted = db.botMode.whitelist?.includes(senderPn) || false;
    if (!isWhitelisted) {
        const allowedPublicCmds = ['ping', 'help', 'mode', 'xdeath', 'owner'];
        if (!allowedPublicCmds.includes(command)) {
            return;
        }
    }
}
   
        // ─── Check jailed / prisoned users (delete ALL their messages) ───
        if (isGroup && !isCreator && !isAdmins && db.jailed?.[m.chat]?.[m.sender]) {
            const jailedData = db.jailed[m.chat][m.sender];
            if (jailedData.until && Date.now() > jailedData.until) {
                delete db.jailed[m.chat][m.sender];
                saveDB();
            } else {
                // Delete any message type: text, image, sticker, audio, video, etc.
                try {
                    await empire.sendMessage(m.chat, { delete: m.key });
                } catch (_) {}
                try {
                    if (m.key) {
                        await empire.sendMessage(m.chat, {
                            delete: {
                                remoteJid: m.chat,
                                fromMe: false,
                                id: m.key.id,
                                participant: m.key.participant || m.sender
                            }
                        });
                    }
                } catch (_) {}
                return;
            }
        }
        // ─── AUTO REACT HANDLER ───
if (autoMessageReact && !m.key?.fromMe && m.key?.remoteJid !== 'status@broadcast') {
    try {
        if (!m.message?.protocolMessage) {
            const id = m.key?.id;
            if (id && !processedMessages.has(id)) {
                processedMessages.add(id);
                setTimeout(async () => {
                    const reactions = ["❤️","🔥","👍","✅","💯","🎯","😎","✨","🌟","🎉"];
                    const r = reactions[Math.floor(Math.random() * reactions.length)];
                    await empire.sendMessage(m.chat, { 
                        react: { text: r, key: m.key } 
                    }).catch(() => {});
                }, 1000);
                if (processedMessages.size > 500) {
                    [...processedMessages].slice(0, 250).forEach(x => processedMessages.delete(x));
                }
            }
        }
    } catch (e) {}
}

        // ─── ANTI HANDLERS ───
        try { await antidelete.storeMessage(empire, m); } catch {}
        // Safe wrappers - these functions may not exist, so wrap in try
        try { if (typeof handleAntiLink !== 'undefined') await handleAntiLink(empire, m, isCreator, isAdmins); } catch {}
        try { if (typeof handleAntiSticker !== 'undefined') await handleAntiSticker(empire, m, isCreator, isAdmins); } catch {}
        try { if (typeof handleAntiTag !== 'undefined') await handleAntiTag(empire, m, isCreator, isAdmins); } catch {}
        try { if (typeof handleAntiViewOnce !== 'undefined') await handleAntiViewOnce(empire, m); } catch {}

        if (m.message?.protocolMessage?.type === 0) {
            try { await antidelete.handleRevocation(empire, m); } catch {}
        }

        if (!isCmd) return;

        // Modular commands live in commands/custom/*.js. They run before the
        // legacy switch so new commands can be added without touching case.js.
        if (await runCustomCommand(command, {
            sock: empire, message: m, jid: m.chat, args, text, command, prefix, botNumber,
            reply, isGroup, isCreator, isAdmins, isBotAdmins, groupMetadata,
            participants, groupAdmins, db, newsletterContext, listCommands: listCustomCommands
        })) return;

        switch (command) {

        case 'antidelete':
        case 'ad': {
            await antidelete.handleCommand(empire, m.chat, m, text, isCreator);
            break;
        }


        // ═══════════════════════════════════════════════════
        // 1. PING - Latency check
        // ═══════════════════════════════════════════════════
        case 'ping':
        case 'p': {
            const start = Date.now();
            const pingMsg = await empire.sendMessage(m.chat, { 
                text: '𖠁',
                contextInfo: newsletterContext()
            }, { quoted: m });
            const latency = Date.now() - start;
            const speed = latency < 100 ? '⚡' : latency < 300 ? '✦' : '🐢';

            const response = `${speed} *Pong!*  ᠻ  ${latency}ms`;

            await empire.sendMessage(m.chat, {
                text: response,
                edit: pingMsg.key,
                contextInfo: newsletterContext()
            }).catch(() => {
                empire.sendMessage(m.chat, { 
                    text: response,
                    contextInfo: newsletterContext()
                }, { quoted: m });
            });
            break;
        }

        // // ═══════════════════════════════════════════════════
// 2. MENU - Main command list (EXOTIC BULLETS + NEWSLETTER)
// ═══════════════════════════════════════════════════
case 'menu':
case 'help': {
    const now = moment().tz('Africa/Lagos').format('HH:mm');
    const date = moment().tz('Africa/Lagos').format('DD/MM/YYYY');
    const userName = m.pushName || 'User';
    const up = process.uptime();
    const upStr = `${Math.floor(up/86400)}d ${Math.floor((up%86400)/3600)}h ${Math.floor((up%3600)/60)}m`;

    // Collect all commands count
    const totalCommands = 447;
    const menuText = `╭━━━━━━━━━━━━━━━✦
│  ❍ 𝐕𝐈𝐂𝐎 𝐗𝐌𝐃 𓉳 ❍
╰━━━━━━━━━━━━━━━✦
╭━━━━━━━━━━━━━━━✦
│ 👑 Owner   : 𝐌𝐑 𝐑𝐌𝐒 𓉳
│ ⚡ Prefix  : ${prefix}
│ 👤 User    : ${userName} 
│ 📌 Version : 1.0
│ ⏱️ Uptime  : ⏱ ${upStr} 
│ 🌐 Mode    : ${db.botMode?.mode || 'public'}
│ ⌛Time :  ${now} WAT
│ 📊 Total Commands : ${totalCommands}
╰┅┅┅┅┅┅┅➢

✰ 𝗕𝗢𝗧 𝗠𝗘𝗡𝗨 [32 Commands] ✰
│➾ 🤖 ${prefix}ad
│➾ 🤖 ${prefix}alive
│➾ 🤖 ${prefix}antidelete
│➾ 🤖 ${prefix}ar
│➾ 🤖 ${prefix}autoreact
│➾ 🤖 ${prefix}botid
│➾ 🤖 ${prefix}botinfo
│➾ 🤖 ${prefix}botmode
│➾ 🤖 ${prefix}botstatus
│➾ 🤖 ${prefix}channelid
│➾ 🤖 ${prefix}chatid
│➾ 🤖 ${prefix}donate
│➾ 🤖 ${prefix}groupid
│➾ 🤖 ${prefix}groupjid
│➾ 🤖 ${prefix}idch
│➾ 🤖 ${prefix}jid
│➾ 🤖 ${prefix}link
│➾ 🤖 ${prefix}listpair
│➾ 🤖 ${prefix}mode
│➾ 🤖 ${prefix}mypp
│➾ 🤖 ${prefix}owner
│➾ 🤖 ${prefix}p
│➾ 🤖 ${prefix}pair
│➾ 🤖 ${prefix}ping
│➾ 🤖 ${prefix}repo
│➾ 🤖 ${prefix}repository
│➾ 🤖 ${prefix}runtime
│➾ 🤖 ${prefix}script
│➾ 🤖 ${prefix}setmode
│➾ 🤖 ${prefix}setprefix 
│➾ 🤖 ${prefix}status
│➾ 🤖 ${prefix}whoami
┗┅┅┅┅┅┅┅➢

✰ 𝗔𝗜 𝗠𝗘𝗡𝗨 [15 Commands] ✰
│➾ 🧠 ${prefix}ai
│➾ 🧠 ${prefix}aiimage
│➾ 🧠 ${prefix}ask
│➾ 🧠 ${prefix}chat
│➾ 🧠 ${prefix}deep
│➾ 🧠 ${prefix}deepseek
│➾ 🧠 ${prefix}describe
│➾ 🧠 ${prefix}draw
│➾ 🧠 ${prefix}ds
│➾ 🧠 ${prefix}flux
│➾ 🧠 ${prefix}fluximg
│➾ 🧠 ${prefix}gemini
│➾ 🧠 ${prefix}generate
│➾ 🧠 ${prefix}imagine
┗┅┅┅┅┅┅┅➢

✰ 𝗗𝗢𝗪𝗡𝗟𝗢𝗔𝗗 / 𝗠𝗘𝗗𝗜𝗔 𝗠𝗘𝗡𝗨 [71 Commands] ✰
│➾ 🎬 ${prefix}ayah
│➾ 🎬 ${prefix}ayat
│➾ 🎬 ${prefix}bible
│➾ 🎬 ${prefix}bibleverse
│➾ 🎬 ${prefix}extractaudio
│➾ 🎬 ${prefix}facebook
│➾ 🎬 ${prefix}fb
│➾ 🎬 ${prefix}fbdl
│➾ 🎬 ${prefix}gcsl
│➾ 🎬 ${prefix}gcs
│➾ 🎬 ${prefix}gcslink
│➾ 🎬 ${prefix}gcstatus
│➾ 🎬 ${prefix}gcstatuslink
│➾ 🎬 ${prefix}gcstory
│➾ 🎬 ${prefix}getpp
│➾ 🎬 ${prefix}getprofilepic
│➾ 🎬 ${prefix}getstatus
│➾ 🎬 ${prefix}gif
│➾ 🎬 ${prefix}gslink
│➾ 🎬 ${prefix}ig
│➾ 🎬 ${prefix}igdl
│➾ 🎬 ${prefix}instagram
│➾ 🎬 ${prefix}kjv
│➾ 🎬 ${prefix}play
│➾ 🎬 ${prefix}poststatus
│➾ 🎬 ${prefix}pp
│➾ 🎬 ${prefix}quran
│➾ 🎬 ${prefix}reveal
│➾ 🎬 ${prefix}s
│➾ 🎬 ${prefix}savestatus
│➾ 🎬 ${prefix}sc
│➾ 🎬 ${prefix}snap
│➾ 🎬 ${prefix}snapchat
│➾ 🎬 ${prefix}snapdl
│➾ 🎬 ${prefix}song
│➾ 🎬 ${prefix}sstatus
│➾ 🎬 ${prefix}statuslink
│➾ 🎬 ${prefix}sticker
│➾ 🎬 ${prefix}stiker
│➾ 🎬 ${prefix}surah
│➾ 🎬 ${prefix}tiktok
│➾ 🎬 ${prefix}toaudio
│➾ 🎬 ${prefix}togcstatus
│➾ 🎬 ${prefix}togif
│➾ 🎬 ${prefix}toimage
│➾ 🎬 ${prefix}toimg
│➾ 🎬 ${prefix}tomp3
│➾ 🎬 ${prefix}tomp4
│➾ 🎬 ${prefix}toptt
│➾ 🎬 ${prefix}tovoice
│➾ 🎬 ${prefix}tr
│➾ 🎬 ${prefix}translate
│➾ 🎬 ${prefix}tt
│➾ 🎬 ${prefix}ttdl
│➾ 🎬 ${prefix}tts
│➾ 🎬 ${prefix}tw
│➾ 🎬 ${prefix}twitter
│➾ 🎬 ${prefix}twitterdl
│➾ 🎬 ${prefix}verse
│➾ 🎬 ${prefix}viewonce
│➾ 🎬 ${prefix}voice
│➾ 🎬 ${prefix}vv
│➾ 🎬 ${prefix}vv2
│➾ 🎬 ${prefix}x
│➾ 🎬 ${prefix}xdl
│➾ 🎬 ${prefix}youtube
│➾ 🎬 ${prefix}yt
│➾ 🎬 ${prefix}ytmp3
│➾ 🎬 ${prefix}ytmp4
│➾ 🎬 ${prefix}ytvideo
┗┅┅┅┅┅┅┅➢

✰ 𝗚𝗥𝗢𝗨𝗣 𝗠𝗘𝗡𝗨 [60 Commands] ✰
│➾ 👥 ${prefix}add
│➾ 👥 ${prefix}addmember
│➾ 👥 ${prefix}adminlist
│➾ 👥 ${prefix}admins
│➾ 👥 ${prefix}admins2
│➾ 👥 ${prefix}demote
│➾ 👥 ${prefix}everyone
│➾ 👥 ${prefix}gcadmins
│➾ 👥 ${prefix}gcdescription
│➾ 👥 ${prefix}gcinfo
│➾ 👥 ${prefix}gclock
│➾ 👥 ${prefix}gcmembers
│➾ 👥 ${prefix}gcmode
│➾ 👥 ${prefix}gcopen
│➾ 👥 ${prefix}gcs
│➾ 👥 ${prefix}gcstats
│➾ 👥 ${prefix}gcstatus
│➾ 👥 ${prefix}groupadmins
│➾ 👥 ${prefix}groupcount
│➾ 👥 ${prefix}groupdesc
│➾ 👥 ${prefix}groupid
│➾ 👥 ${prefix}groupinfo
│➾ 👥 ${prefix}groupjid
│➾ 👥 ${prefix}grouplink
│➾ 👥 ${prefix}grouplink2
│➾ 👥 ${prefix}grouplock
│➾ 👥 ${prefix}groupmembers
│➾ 👥 ${prefix}groupmenu
│➾ 👥 ${prefix}groupmode
│➾ 👥 ${prefix}groupopen
│➾ 👥 ${prefix}groupowner
│➾ 👥 ${prefix}groupstat
│➾ 👥 ${prefix}groupstats
│➾ 👥 ${prefix}groupstatus
│➾ 👥 ${prefix}grouptime
│➾ 👥 ${prefix}hidetag
│➾ 👥 ${prefix}jail
│➾ 👥 ${prefix}kick
│➾ 👥 ${prefix}kickall
│➾ 👥 ${prefix}makeadmin
│➾ 👥 ${prefix}membercount
│➾ 👥 ${prefix}members
│➾ 👥 ${prefix}mentionall
│➾ 👥 ${prefix}mute
│➾ 👥 ${prefix}nonadmins
│➾ 👥 ${prefix}prison
│➾ 👥 ${prefix}promote
│➾ 👥 ${prefix}release
│➾ 👥 ${prefix}remove
│➾ 👥 ${prefix}resetgrouplink
│➾ 👥 ${prefix}resetlink
│➾ 👥 ${prefix}revokelink
│➾ 👥 ${prefix}setdesc
│➾ 👥 ${prefix}setdescription
│➾ 👥 ${prefix}setgcname
│➾ 👥 ${prefix}setname
│➾ 👥 ${prefix}setsubject
│➾ 👥 ${prefix}silenttag
│➾ 👥 ${prefix}tagadmins
│➾ 👥 ${prefix}tagall
│➾ 👥 ${prefix}tagall2
│➾ 👥 ${prefix}unadmin
│➾ 👥 ${prefix}unjail
┗┅┅┅┅┅┅┅➢

✰ 𝗢𝗪𝗡𝗘𝗥 𝗠𝗘𝗡𝗨 [10 Commands] ✰
│➾ 👑 ${prefix}autoreact
│➾ 👑 ${prefix}aza
│➾ 👑 ${prefix}botmode
│➾ 👑 ${prefix}del
│➾ 👑 ${prefix}delaza
│➾ 👑 ${prefix}delete
│➾ 👑 ${prefix}mode
│➾ 👑 ${prefix}removeaza
│➾ 👑 ${prefix}setaza
│➾ 👑 ${prefix}setmode
┗┅┅┅┅┅┅┅➢

✰ 𝗖𝗢𝗢𝗟 / 𝗠𝗔𝗧𝗛𝗦 𝗠𝗘𝗡𝗨 [104 Commands] ✰
│➾ 🧮 ${prefix}advice
│➾ 🧮 ${prefix}average
│➾ 🧮 ${prefix}bal
│➾ 🧮 ${prefix}balance
│➾ 🧮 ${prefix}biblequote
│➾ 🧮 ${prefix}binary
│➾ 🧮 ${prefix}blackjack
│➾ 🧮 ${prefix}bomb
│➾ 🧮 ${prefix}bombgame 
│➾ 🧮 ${prefix}calc
│➾ 🧮 ${prefix}cargame
│➾ 🧮 ${prefix}chars
│➾ 🧮 ${prefix}coin
│➾ 🧮 ${prefix}coinflip
│➾ 🧮 ${prefix}compliment
│➾ 🧮 ${prefix}compliments
│➾ 🧮 ${prefix}count
│➾ 🧮 ${prefix}cpu
│➾ 🧮 ${prefix}crashgame
│➾ 🧮 ${prefix}dare
│➾ 🧮 ${prefix}dare2
│➾ 🧮 ${prefix}date
│➾ 🧮 ${prefix}day
│➾ 🧮 ${prefix}dice
│➾ 🧮 ${prefix}dicegame
│➾ 🧮 ${prefix}divide
│➾ 🧮 ${prefix}echo
│➾ 🧮 ${prefix}fact
│➾ 🧮 ${prefix}fightgame
│➾ 🧮 ${prefix}fliptext
│➾ 🧮 ${prefix}flirt
│➾ 🧮 ${prefix}galaxy
│➾ 🧮 ${prefix}gay
│➾ 🧮 ${prefix}gist
│➾ 🧮 ${prefix}guess
│➾ 🧮 ${prefix}hang
│➾ 🧮 ${prefix}higherlower
│➾ 🧮 ${prefix}insult
│➾ 🧮 ${prefix}insultme
│➾ 🧮 ${prefix}joke
│➾ 🧮 ${prefix}jokegame
│➾ 🧮 ${prefix}length
│➾ 🧮 ${prefix}lowercase
│➾ 🧮 ${prefix}mathfact
│➾ 🧮 ${prefix}mathgame
│➾ 🧮 ${prefix}memory
│➾ 🧮 ${prefix}memorygame
│➾ 🧮 ${prefix}minegame
│➾ 🧮 ${prefix}multiply
│➾ 🧮 ${prefix}never
│➾ 🧮 ${prefix}node
│➾ 🧮 ${prefix}p
│➾ 🧮 ${prefix}pacman
│➾ 🧮 ${prefix}password
│➾ 🧮 ${prefix}percent
│➾ 🧮 ${prefix}pick
│➾ 🧮 ${prefix}ping
│➾ 🧮 ${prefix}planet
│➾ 🧮 ${prefix}platform
│➾ 🧮 ${prefix}plinkogame
│➾ 🧮 ${prefix}power
│➾ 🧮 ${prefix}proverb
│➾ 🧮 ${prefix}qr
│➾ 🧮 ${prefix}quaranquote
│➾ 🧮 ${prefix}quiz
│➾ 🧮 ${prefix}quranquote
│➾ 🧮 ${prefix}qz
│➾ 🧮 ${prefix}rate
│➾ 🧮 ${prefix}rape
│➾ 🧮 ${prefix}recipe
│➾ 🧮 ${prefix}repeat
│➾ 🧮 ${prefix}roast
│➾ 🧮 ${prefix}roulette
│➾ 🧮 ${prefix}rps
│➾ 🧮 ${prefix}sciencefact
│➾ 🧮 ${prefix}scramble
│➾ 🧮 ${prefix}server
│➾ 🧮 ${prefix}ship
│➾ 🧮 ${prefix}short
│➾ 🧮 ${prefix}shorturl
│➾ 🧮 ${prefix}slide
│➾ 🧮 ${prefix}slots
│➾ 🧮 ${prefix}snake
│➾ 🧮 ${prefix}snakegame
│➾ 🧮 ${prefix}space
│➾ 🧮 ${prefix}speedgame
│➾ 🧮 ${prefix}stupid
│➾ 🧮 ${prefix}sum
│➾ 🧮 ${prefix}tetris
│➾ 🧮 ${prefix}tictactoe
│➾ 🧮 ${prefix}time
│➾ 🧮 ${prefix}timestamp
│➾ 🧮 ${prefix}timezone
│➾ 🧮 ${prefix}tinytext
│➾ 🧮 ${prefix}trivia
│➾ 🧮 ${prefix}truth
│➾ 🧮 ${prefix}truth2
│➾ 🧮 ${prefix}typegame
│➾ 🧮 ${prefix}uppercase
│➾ 🧮 ${prefix}uuid
│➾ 🧮 ${prefix}weather
│➾ 🧮 ${prefix}whackgame
│➾ 🧮 ${prefix}wheel
│➾ 🧮 ${prefix}word
│➾ 🧮 ${prefix}wordle
│➾ 🧮 ${prefix}words
│➾ 🧮 ${prefix}wyr
│➾ 🧮 ${prefix}yarn
┗┅┅┅┅┅┅┅➢

✰ 𝗚𝗜𝗙 𝗥𝗘𝗔𝗖𝗧𝗜𝗢𝗡𝗦 𝗠𝗘𝗡𝗨 [51 Commands] ✰
│➾ 🎭 ${prefix}angry
│➾ 🎭 ${prefix}baka
│➾ 🎭 ${prefix}bite
│➾ 🎭 ${prefix}bleh
│➾ 🎭 ${prefix}blush
│➾ 🎭 ${prefix}bonk
│➾ 🎭 ${prefix}bored
│➾ 🎭 ${prefix}carry
│➾ 🎭 ${prefix}clap
│➾ 🎭 ${prefix}confused
│➾ 🎭 ${prefix}cry
│➾ 🎭 ${prefix}cuddle
│➾ 🎭 ${prefix}dance
│➾ 🎭 ${prefix}facepalm
│➾ 🎭 ${prefix}feed
│➾ 🎭 ${prefix}handshake
│➾ 🎭 ${prefix}happy
│➾ 🎭 ${prefix}highfive
│➾ 🎭 ${prefix}hug
│➾ 🎭 ${prefix}kabedon
│➾ 🎭 ${prefix}kiss
│➾ 🎭 ${prefix}lurk
│➾ 🎭 ${prefix}nod
│➾ 🎭 ${prefix}nom
│➾ 🎭 ${prefix}nope
│➾ 🎭 ${prefix}nya
│➾ 🎭 ${prefix}pat
│➾ 🎭 ${prefix}peck
│➾ 🎭 ${prefix}poke
│➾ 🎭 ${prefix}pout
│➾ 🎭 ${prefix}punch
│➾ 🎭 ${prefix}run
│➾ 🎭 ${prefix}shake
│➾ 🎭 ${prefix}shocked
│➾ 🎭 ${prefix}shoot
│➾ 🎭 ${prefix}shrug
│➾ 🎭 ${prefix}sip
│➾ 🎭 ${prefix}slap
│➾ 🎭 ${prefix}sleep
│➾ 🎭 ${prefix}smile
│➾ 🎭 ${prefix}smug
│➾ 🎭 ${prefix}spin
│➾ 🎭 ${prefix}stare
│➾ 🎭 ${prefix}teehee
│➾ 🎭 ${prefix}think
│➾ 🎭 ${prefix}tickle
│➾ 🎭 ${prefix}wag
│➾ 🎭 ${prefix}wave
│➾ 🎭 ${prefix}wink
│➾ 🎭 ${prefix}yawn
│➾ 🎭 ${prefix}yeet
┗┅┅┅┅┅┅┅➢

╭━━━━━━━━━━━━━━━✦
│ 💎 𝐕𝐈𝐂𝐎 𝐗𝐌𝐃 𓉳 · 𝐃𝐄𝐕 𝐑𝐌𝐒
│ 📢 𝐓𝐄𝐀𝐌 : 𝐑𝐌𝐒 𝐓𝐄𝐂𝐇
│. 💯 𝐓𝐎𝐓𝐀𝐋 𝐂𝐎𝐌𝐌𝐀𝐍𝐃𝐒 : ${totalCommands}
╰━━━━━━━━━━━━━━━✦`;

    try {
        // Prefer local logo, then loaded buffer, then working catbox URL
        let imagePayload = null;
        const absPath = path.join(__dirname, '../media/logo.jpg');
        const relPath = './media/logo.jpg';

        if (typeof menuImageBuffer !== 'undefined' && menuImageBuffer && menuImageBuffer.length > 100) {
            imagePayload = { image: menuImageBuffer };
        } else if (fs.existsSync(absPath)) {
            imagePayload = { image: fs.readFileSync(absPath) };
        } else if (fs.existsSync(relPath)) {
            imagePayload = { image: fs.readFileSync(relPath) };
        } else {
            // Working fallback link
            imagePayload = { image: { url: 'https://files.catbox.moe/s7kl0m.jpg' } };
        }

        await empire.sendMessage(m.chat, {
            ...imagePayload,
            caption: menuText,
            contextInfo: newsletterContext({ mentionedJid: [m.sender] })
        }, { quoted: m });
    } catch (e) {
        console.error('❌ Menu send error:', e.message);
        try {
            await empire.sendMessage(m.chat, {
                image: { url: 'https://files.catbox.moe/s7kl0m.jpg' },
                caption: menuText,
                contextInfo: newsletterContext({ mentionedJid: [m.sender] })
            }, { quoted: m });
        } catch (e2) {
            await empire.sendMessage(m.chat, { text: menuText, contextInfo: newsletterContext() }, { quoted: m });
        }
    }
    break;
}
// ═══════════════════════════════════════════════════
// TIKTOK DOWNLOAD COMMAND
// ═══════════════════════════════════════════════════
// ═══════════════════════════════════════════════════
// TIKTOK DOWNLOAD COMMAND (Using wa-sticker-formatter)
// ═══════════════════════════════════════════════════
case 'tiktok':
case 'tt':
case 'ttdl': {
    if (!text) return reply(`🎵 *TikTok Downloader*\n\nUsage: ${prefix}tiktok <url>\nExample: ${prefix}tiktok https://vm.tiktok.com/ZMrgKWmVd`);
    
    if (!text.includes('tiktok.com') && !text.includes('vm.tiktok.com')) {
        return reply('❌ Please provide a valid TikTok video URL.');
    }
    
    await reply('📥 *Processing TikTok video...* Please wait.');
    
    try {
        // ─── CALL TIKTOK API ───
        const apiUrl = `https://api.princetechn.com/api/download/tiktok?apikey=prince&url=${encodeURIComponent(text)}`;
        const response = await axios.get(apiUrl, { 
            timeout: 30000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        
        if (!response.data?.success || !response.data?.result) {
            return reply('❌ Failed to fetch TikTok video. The video may be private or unavailable.');
        }
        
        const result = response.data.result;
        const videoUrl = result.video;
        const musicUrl = result.music;
        const coverUrl = result.cover;
        const title = result.title || 'TikTok Video';
        const duration = result.duration || 0;
        const author = result.author?.name || 'Unknown';
        
        if (!videoUrl) {
            return reply('❌ No video URL found. The video may be unavailable.');
        }
        
        // ─── SEND THUMBNAIL WITH INFO ───
        if (coverUrl) {
            try {
                await empire.sendMessage(m.chat, {
                    image: { url: coverUrl },
                    caption: `🎵 *${title || 'TikTok Video'}*\n\n👤 *Author:* @${author}\n⏱️ *Duration:* ${duration}s\n📥 *Downloading and processing...*`,
                    contextInfo: newsletterContext()
                }, { quoted: m });
            } catch (e) {}
        }
        
        // ─── DOWNLOAD VIDEO ───
        await reply('⏳ *Downloading video...*');
        
        const videoResponse = await axios.get(videoUrl, {
            responseType: 'arraybuffer',
            timeout: 60000,
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': '*/*'
            }
        });
        
        let videoBuffer = Buffer.from(videoResponse.data);
        
        if (!videoBuffer || videoBuffer.length < 1000) {
            return reply('❌ Failed to download video. The file may be corrupted.');
        }
        
        // ─── CONVERT VIDEO USING WA-STICKER-FORMATTER ───
        try {
            await reply('🔄 *Processing video for WhatsApp...*');
            
            const { Sticker } = require('wa-sticker-formatter');
            
            // Create an animated sticker (which is actually a video)
            const sticker = new Sticker(videoBuffer, {
                type: 'animated',  // This processes the video
                quality: 80,
                id: Date.now().toString(),
                pack: 'TikTok Video',
                author: `@${author}`
            });
            
            // Convert to sticker buffer (this processes the video)
            const stickerBuffer = await sticker.toBuffer();
            
            if (stickerBuffer && stickerBuffer.length > 1000) {
                // Send as video with gifPlayback (works like GIF)
                await empire.sendMessage(m.chat, {
                    video: stickerBuffer,
                    gifPlayback: true,
                    caption: `🎵━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🎵
        ✦  TIKTOK VIDEO  ✦
🎵━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🎵

📝 *Title:* ${title || 'No title'}
👤 *Author:* @${author}
⏱️ *Duration:* ${duration}s
📦 *Size:* ${(stickerBuffer.length / 1024 / 1024).toFixed(1)} MB

🎵━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🎵`,
                    contextInfo: newsletterContext()
                }, { quoted: m });
                
                console.log(`✅ TikTok video sent via wa-sticker-formatter`);
            } else {
                throw new Error('Sticker conversion failed');
            }
            
        } catch (convErr) {
            console.error('wa-sticker-formatter error:', convErr);
            
            // ─── FALLBACK: Send original video ───
            await reply('⚠️ *Processing with original format...*');
            
            try {
                await empire.sendMessage(m.chat, {
                    video: videoBuffer,
                    caption: `🎵━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🎵
        ✦  TIKTOK VIDEO  ✦
🎵━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🎵

📝 *Title:* ${title || 'No title'}
👤 *Author:* @${author}
⏱️ *Duration:* ${duration}s
📦 *Size:* ${(videoBuffer.length / 1024 / 1024).toFixed(1)} MB

🎵━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🎵`,
                    contextInfo: newsletterContext()
                }, { quoted: m });
            } catch (sendErr) {
                // ─── FINAL FALLBACK: Send as document ───
                await reply('⚠️ *Sending as file...*');
                await empire.sendMessage(m.chat, {
                    document: videoBuffer,
                    mimetype: 'video/mp4',
                    fileName: `TikTok_${author}_${Date.now()}.mp4`,
                    caption: `🎵 *TikTok Video*\n👤 @${author}\n📝 ${title}`,
                    contextInfo: newsletterContext()
                }, { quoted: m });
            }
        }
        
        // ─── SEND AUDIO (Works already) ───
        if (musicUrl) {
            try {
                const audioResponse = await axios.get(musicUrl, {
                    responseType: 'arraybuffer',
                    timeout: 30000
                });
                const audioBuffer = Buffer.from(audioResponse.data);
                
                if (audioBuffer && audioBuffer.length > 1000) {
                    await empire.sendMessage(m.chat, {
                        audio: audioBuffer,
                        mimetype: 'audio/mpeg',
                        fileName: `${author}_${Date.now()}.mp3`,
                        ptt: false,
                        contextInfo: newsletterContext()
                    }, { quoted: m });
                }
            } catch (e) {
                console.log('Audio download failed:', e.message);
            }
        }
        
    } catch (e) {
        console.error('TikTok download error:', e);
        reply(`❌ *Failed to download:* ${e.message || 'Unknown error'}`);
    }
    break;
}
// ═══════════════════════════════════════════════════
// GIF REACTION COMMANDS
// ═══════════════════════════════════════════════════
// ═══════════════════════════════════════════════════
// GIF REACTION COMMANDS (FIXED)
// ═══════════════════════════════════════════════════

// ═══════════════════════════════════════════════════
// NEKOSBEST — 50 SFW REACTION COMMANDS
// ═══════════════════════════════════════════════════
case 'lurk': case 'shoot': case 'sleep': case 'clap': case 'shrug':
case 'stare': case 'wave': case 'poke': case 'confused': case 'smile':
case 'peck': case 'wink': case 'sip': case 'blush': case 'smug':
case 'tickle': case 'yeet': case 'think': case 'highfive': case 'feed':
case 'wag': case 'bite': case 'teehee': case 'shocked': case 'bleh':
case 'bored': case 'nom': case 'nya': case 'yawn': case 'facepalm':
case 'cuddle': case 'happy': case 'carry': case 'hug': case 'kabedon':
case 'baka': case 'bonk': case 'pat': case 'angry': case 'spin':
case 'shake': case 'run': case 'nod': case 'nope': case 'kiss': case 'dance':
case 'punch': case 'handshake': case 'slap': case 'cry': case 'pout': {
    await sendNekosBestReaction(empire, m, command, prefix, args);
    break;
}

// ═══════════════════════════════════════════════════
// BOT MODE - Public / Private
// ═══════════════════════════════════════════════════
case 'mode':
case 'botmode':
case 'setmode': {
    if (!isCreator) return reply('❌ *Only the bot owner can change bot mode.*');
    
    const opt = args[0]?.toLowerCase();
    
    // ─── SHOW CURRENT MODE ───
    if (!opt) {
        const mode = db.botMode?.mode || 'public';
        const whitelist = db.botMode?.whitelist || [];
        const whitelistDisplay = whitelist.length > 0 
            ? whitelist.map(j => `  ✦ @${j.split('@')[0]}`).join('\n') 
            : '  ✦ None';
        
        return reply(
`🔒━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🔒
        ✦  BOT MODE  ✦
🔒━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🔒

📊 *Current Mode:* ${mode.toUpperCase()}

📌 *Commands:*
✦ ${prefix}mode public     ⋮ Allow everyone
✦ ${prefix}mode private    ⋮ Owner & whitelist only

🔒━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🔒`
        );
    }
    
    // ─── SET TO PUBLIC MODE ───
    if (opt === 'public') {
        db.botMode.mode = 'public';
        saveDB();
        reply(
`🌍 *MODE: PUBLIC*
━━━━━━━━━━━━━━━━━━━━━━━

✅ Everyone can use all commands.

📌 *Private mode:*
${prefix}mode private

🌍━━━━━━━━━━━━━━━━━━━━━━━`
        );
        break;
    }
    
    // ─── SET TO PRIVATE MODE ───
    if (opt === 'private') {
        db.botMode.mode = 'private';
        saveDB();
        reply(
`🔒 *MODE: PRIVATE*
━━━━━━━━━━━━━━━━━━━━━━━

✅ Only the bot owner and whitelisted users can use commands.

📌 *Switch to public:*
${prefix}mode public

🔒━━━━━━━━━━━━━━━━━━━━━━━`
        );
        break;
    }
    
    // ─── SHOW WHITELIST ───
    if (opt === 'whitelist' || opt === 'wl' || opt === 'list') {
        const whitelist = db.botMode?.whitelist || [];
        if (whitelist.length === 0) {
            return reply(
`👤 *WHITELIST*
━━━━━━━━━━━━━━━━━━━━━━━

📌 *Whitelist is empty.*

Add users with:
${prefix}mode add @user

👤━━━━━━━━━━━━━━━━━━━━━━━`
            );
        }
        const list = whitelist.map((j, i) => `${i+1}. ✦ @${j.split('@')[0]}`).join('\n');
        return reply(
`👤━━━━━━━━━━━━━━━━━━━━━━━━━━━━━👤
        ✦  WHITELIST  ✦
👤━━━━━━━━━━━━━━━━━━━━━━━━━━━━━👤

${list}

👤━━━━━━━━━━━━━━━━━━━━━━━━━━━━━👤
📊 *Total:* ${whitelist.length} users`
        );
    }
    
    // ─── ADD USER TO WHITELIST ───
    if (opt === 'add' || opt === 'adduser') {
        let target = m.mentionedJid?.[0] || (m.quoted ? m.quoted.sender : null) || args[1];
        
        if (!target) {
            return reply(
`❌ *Usage:*
${prefix}mode add @user

📌 *Or reply to a user's message:*
${prefix}mode add`
            );
        }
        
        // Clean JID
        target = target.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
        
        // Check if already whitelisted
        if (!db.botMode.whitelist) db.botMode.whitelist = [];
        if (db.botMode.whitelist.includes(target)) {
            return reply(`⚠️ @${target.split('@')[0]} is already whitelisted.`, { mentions: [target] });
        }
        
        db.botMode.whitelist.push(target);
        saveDB();
        reply(`✅ @${target.split('@')[0]} has been added to the whitelist.`, { mentions: [target] });
        break;
    }
    
    // ─── REMOVE USER FROM WHITELIST ───
    if (opt === 'remove' || opt === 'rem' || opt === 'del' || opt === 'delete') {
        let target = m.mentionedJid?.[0] || (m.quoted ? m.quoted.sender : null) || args[1];
        
        if (!target) {
            return reply(
`❌ *Usage:*
${prefix}mode remove @user

📌 *Or reply to a user's message:*
${prefix}mode remove`
            );
        }
        
        target = target.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
        
        if (!db.botMode.whitelist) db.botMode.whitelist = [];
        const index = db.botMode.whitelist.indexOf(target);
        if (index === -1) {
            return reply(`⚠️ @${target.split('@')[0]} is not in the whitelist.`, { mentions: [target] });
        }
        
        db.botMode.whitelist.splice(index, 1);
        saveDB();
        reply(`✅ @${target.split('@')[0]} has been removed from the whitelist.`, { mentions: [target] });
        break;
    }
    
    // ─── CLEAR ALL WHITELIST ───
    if (opt === 'clear' || opt === 'clearall' || opt === 'reset') {
        db.botMode.whitelist = [];
        saveDB();
        reply(`✅ *Whitelist cleared!*\n\nAll users have been removed from the whitelist.`);
        break;
    }
    
    // ─── INVALID OPTION ───
    reply(
`❌ *Invalid option.*

📌 *Available commands:*
✦ ${prefix}mode public
✦ ${prefix}mode private
✦ ${prefix}mode whitelist
✦ ${prefix}mode add @user
✦ ${prefix}mode remove @user
✦ ${prefix}mode clear`
    );
    break;
}
// ═══════════════════════════════════════════════════
// TOIMAGE - Convert sticker to image
// ═══════════════════════════════════════════════════
case 'toimage':
case 'toimg': {
    try {
        const quoted = m.quoted ? m.quoted : m;
        const mime = quoted.mimetype || '';
        
        if (!/webp/.test(mime) && !/sticker/.test(mime)) {
            return reply(`🖼️ *Usage:* Reply to a sticker with:\n${prefix}toimage\n\nConverts sticker to image (JPG/PNG).`);
        }
        
        await reply('⏳ *Converting sticker to image...*');
        
        const mediaBuffer = await empire.downloadMediaMessage(quoted);
        if (!mediaBuffer || mediaBuffer.length === 0) {
            return reply('❌ Failed to download sticker.');
        }
        
        // Convert webp to image using sharp or ffmpeg
        let imageBuffer = null;
        try {
            const sharp = require('sharp');
            imageBuffer = await sharp(mediaBuffer).toFormat('jpeg').toBuffer();
        } catch (e) {
            // Fallback: try using ffmpeg
            try {
                const { exec } = require('child_process');
                const tmpDir = path.join(process.cwd(), 'tmp');
                if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
                
                const inputPath = path.join(tmpDir, `sticker_${Date.now()}.webp`);
                const outputPath = path.join(tmpDir, `image_${Date.now()}.jpg`);
                
                fs.writeFileSync(inputPath, mediaBuffer);
                await new Promise((resolve, reject) => {
                    exec(`ffmpeg -i "${inputPath}" "${outputPath}"`, (error) => {
                        if (error) reject(error);
                        else resolve();
                    });
                });
                
                imageBuffer = fs.readFileSync(outputPath);
                try { fs.unlinkSync(inputPath); } catch {}
                try { fs.unlinkSync(outputPath); } catch {}
            } catch (e2) {
                console.error('Image conversion error:', e2);
                return reply('❌ Failed to convert sticker to image.');
            }
        }
        
        if (!imageBuffer || imageBuffer.length === 0) {
            return reply('❌ Failed to convert sticker to image.');
        }
        
        await empire.sendMessage(m.chat, {
            image: imageBuffer,
            caption: `🖼️ *Sticker converted to image*\n\n📁 *Format:* JPEG\n📏 *Size:* ${(imageBuffer.length / 1024).toFixed(1)} KB`,
            contextInfo: newsletterContext()
        }, { quoted: m });
        
    } catch (e) {
        console.error('To image error:', e);
        reply(`❌ *Failed to convert:* ${e.message || 'Unknown error'}`);
    }
    break;
}

// ═══════════════════════════════════════════════════
// GETPP - Get profile picture
// ═══════════════════════════════════════════════════
case 'getpp':
case 'getprofilepic':
case 'pp': {
    try {
        let target = m.mentionedJid?.[0] || (m.quoted ? m.quoted.sender : null) || m.sender;
        
        // If text is provided, try to get user by number
        if (text && !target) {
            const number = text.replace(/[^0-9]/g, '');
            if (number.length >= 8) {
                target = `${number}@s.whatsapp.net`;
            }
        }
        
        const ppUrl = await empire.profilePictureUrl(target, 'image').catch(() => null);
        if (!ppUrl) {
            const name = target ? `@${target.split('@')[0]}` : 'this user';
            return reply(`❌ No profile picture found for ${name}.`, { mentions: [target] });
        }
        
        await empire.sendMessage(m.chat, {
            image: { url: ppUrl },
            caption: `🖼️ *Profile Picture*\n\n👤 *User:* @${target.split('@')[0]}`,
            mentions: [target],
            contextInfo: newsletterContext()
        }, { quoted: m });
        
    } catch (e) {
        console.error('Get PP error:', e);
        reply(`❌ *Failed to fetch profile picture:* ${e.message || 'Unknown error'}`);
    }
    break;
}

case 'insultme':
case 'roast': {
    try {
        const roasts = [
            "Your Wi-Fi has more stability than your decisions. 😭",
            "You bring “loading…” to every conversation. 💀",
            "Even autocorrect gives up on you. 😂",
            "You have the charisma of a dead battery. 🔋",
            "You're like a software update, nobody asked for you but you keep popping up. 😭",
            "If common sense was data, you'd be on airplane mode. ✈️",
            "Your comeback is still buffering. 💀",
            "You have 99 problems and your personality is all of them. 😂",
            "You're the reason the group chat is on mute. 🔇",
            "You bring zero to the table but still want front seat. 💀",
            "Even Google can't find your relevance. 😭",
            "You're not dumb, you just have bad luck thinking. 🤦",
            "Your confidence is high but your IQ is on low battery.",
            "You are like Monday morning, nobody likes you. 😂",
            "If you were a spice, you'd be flour. 😐",
            "Your life needs a restart button, not an update. 🔄",
            "You type so much nonsense, dictionary is tired of you. 📚",
            "You're proof that not everyone evolves. 💀",
            "Your opinion is like free WiFi in Aba, useless and slow. 😭",
            "You look like you argue with your shadow and lose. 😂",
            "Your brain went on vacation and never returned. 🏖️",
            "You're the human version of 'This message was deleted'. 💀",
            "If laziness was a job, you'd be CEO. 👑",
            "You have the energy of a nokia torch with low battery. 🔦",
            "You're so boring, even your shadow leaves you. 😭",
            "You are like free trial, annoying and expires fast. 💀",
            "Your gist is like NEPA light, it goes off when it's interesting. 😂",
            "You're the type to fail captcha, even robot knows you ain't human. 🤖"
        ];

        const roast = roasts[Math.floor(Math.random() * roasts.length)];

        await reply(`🔥 *ROAST*\n\n${roast}`);

    } catch (err) {
        console.error('Roast error:', err);
        reply(`❌ *Failed to roast:* ${err.message || 'Unknown error'}`);
    }
    break;
}

case 'setpp':
case 'setprofilepic': {
    if (!isCreator) return reply("❌ *Owner only!*");
    
    const quoted = m.quoted ? m.quoted : m;
    const mime = quoted.mimetype || quoted.msg?.mimetype || '';
    
    if (!/image/.test(mime)) {
        return reply(`🖼️ *Usage:* Reply to an image with:\n${prefix}setpp\n\nSet your profile picture`);
    }
    
    try {
        await reply('⏳ *Updating bot profile picture...*');
        
        // FIX: Use correct download method
        const mediaBuffer = await empire.downloadMediaMessage(quoted, 'buffer', {}, { 
            logger: console, 
            reuploadRequest: empire.updateMediaMessage 
        }).catch(async () => {
            // Fallback for baileys
            const { downloadContentFromMessage } = require("@whiskeysockets/baileys");
            const type = Object.keys(quoted.message || quoted.msg || {})[0];
            const stream = await downloadContentFromMessage(quoted.message?.[type] || quoted.msg, 'image');
            let buffer = Buffer.from([]);
            for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
            return buffer;
        });

        if (!mediaBuffer || mediaBuffer.length === 0) {
            return reply('❌ Failed to download image.');
        }
        
        // FIX: Correct Baileys syntax - needs bot JID
        const botJid = empire.user.id;
        await empire.updateProfilePicture(botJid, mediaBuffer);
        reply(`✅ *Profile picture updated successfully!*`);

    } catch (e) {
        console.error('Set PP error:', e);
        reply(`❌ *Failed:* ${e.message || 'Unknown error'}\nMake sure na image you reply.`);
    }
    break;
}

// ═══════════════════════════════════════════════════
// TOAUDIO - Convert video to audio
// ═══════════════════════════════════════════════════
case 'toaudio':
case 'tomp3':
case 'extractaudio': {
    try {
        const quoted = m.quoted ? m.quoted : m;
        const mime = quoted.mimetype || '';
        
        if (!/video/.test(mime) && !/audio/.test(mime)) {
            return reply(`🎵 *Usage:* Reply to a video or audio with:\n${prefix}toaudio\n\nExtracts/Converts to MP3 audio.`);
        }
        
        await reply('⏳ *Converting to audio...*');
        
        const mediaBuffer = await empire.downloadMediaMessage(quoted);
        if (!mediaBuffer || mediaBuffer.length === 0) {
            return reply('❌ Failed to download media.');
        }
        
        // Use top-level import: const { toAudio, toPTT } = require('../lib/converter.js');
        
        // Determine format
        let format = 'mp4';
        if (mime.includes('mpeg') || mime.includes('mp4')) format = 'mp4';
        else if (mime.includes('ogg')) format = 'ogg';
        else if (mime.includes('webm')) format = 'webm';
        else if (mime.includes('mov')) format = 'mov';
        
        const audioBuffer = await toAudio(mediaBuffer, format);
        
        if (!audioBuffer || audioBuffer.length === 0) {
            return reply('❌ Failed to convert to audio.');
        }
        
        const title = m.quoted?.message?.videoMessage?.caption || 
                     m.quoted?.message?.audioMessage?.caption || 
                     'audio';
        
        await empire.sendMessage(m.chat, {
            audio: audioBuffer,
            mimetype: 'audio/mpeg',
            ptt: false,
            fileName: `${title}.mp3`,
            contextInfo: newsletterContext()
        }, { quoted: m });
        
    } catch (e) {
        console.error('To audio error:', e);
        reply(`❌ *Failed to convert:* ${e.message || 'Unknown error'}`);
    }
    break;
}

// ═══════════════════════════════════════════════════
// TOGIF - Convert video/sticker to GIF
// ═══════════════════════════════════════════════════
case 'togif':
case 'gif':
case 'tomp4': {
    try {
        const quoted = m.quoted ? m.quoted : m;
        const mime = quoted.mimetype || '';
        
        if (!/video/.test(mime) && !/webp/.test(mime) && !/gif/.test(mime)) {
            return reply(`🎬 *Usage:* Reply to a video or animated sticker with:\n${prefix}togif\n\nConverts to GIF/MP4.`);
        }
        
        await reply('⏳ *Converting to GIF...*');
        
        let mediaBuffer = await empire.downloadMediaMessage(quoted);
        if (!mediaBuffer || mediaBuffer.length === 0) {
            return reply('❌ Failed to download media.');
        }
        
        // If it's a sticker, convert to video first
        if (mime.includes('webp')) {
            try {
                const { exec } = require('child_process');
                const tmpDir = path.join(process.cwd(), 'tmp');
                if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
                
                const inputPath = path.join(tmpDir, `sticker_${Date.now()}.webp`);
                const outputPath = path.join(tmpDir, `video_${Date.now()}.mp4`);
                
                fs.writeFileSync(inputPath, mediaBuffer);
                await new Promise((resolve, reject) => {
                    exec(`ffmpeg -i "${inputPath}" -vf "fps=15,scale=512:512:force_original_aspect_ratio=decrease" -c:v libx264 -pix_fmt yuv420p "${outputPath}"`, (error) => {
                        if (error) reject(error);
                        else resolve();
                    });
                });
                
                mediaBuffer = fs.readFileSync(outputPath);
                try { fs.unlinkSync(inputPath); } catch {}
                try { fs.unlinkSync(outputPath); } catch {}
            } catch (e) {
                console.error('Sticker to video error:', e);
                return reply('❌ Failed to convert sticker to video.');
            }
        }
        
        // Send as GIF with gifPlayback
        await empire.sendMessage(m.chat, {
            video: mediaBuffer,
            gifPlayback: true,
            caption: `🎬 *GIF Created*\n\n📏 *Size:* ${(mediaBuffer.length / 1024).toFixed(1)} KB`,
            contextInfo: newsletterContext()
        }, { quoted: m });
        
    } catch (e) {
        console.error('To GIF error:', e);
        reply(`❌ *Failed to convert:* ${e.message || 'Unknown error'}`);
    }
    break;
}

// ═══════════════════════════════════════════════════
// TOPTT - Convert audio/video to voice note (PTT)
// ═══════════════════════════════════════════════════
case 'toptt':
case 'tovoice':
case 'voice': {
    try {
        const quoted = m.quoted ? m.quoted : m;
        const mime = quoted.mimetype || '';
        
        if (!/video/.test(mime) && !/audio/.test(mime)) {
            return reply(`🎤 *Usage:* Reply to a video or audio with:\n${prefix}toptt\n\nConverts to voice note (PTT).`);
        }
        
        await reply('⏳ *Converting to voice note...*');
        
        const mediaBuffer = await empire.downloadMediaMessage(quoted);
        if (!mediaBuffer || mediaBuffer.length === 0) {
            return reply('❌ Failed to download media.');
        }
        
        // Use top-level import: const { toAudio, toPTT } = require('../lib/converter.js');
        
        // Determine format
        let format = 'mp4';
        if (mime.includes('mpeg') || mime.includes('mp4')) format = 'mp4';
        else if (mime.includes('ogg')) format = 'ogg';
        else if (mime.includes('webm')) format = 'webm';
        else if (mime.includes('mov')) format = 'mov';
        
        const pttBuffer = await toPTT(mediaBuffer, format);
        
        if (!pttBuffer || pttBuffer.length === 0) {
            return reply('❌ Failed to convert to voice note.');
        }
        
        await empire.sendMessage(m.chat, {
            audio: pttBuffer,
            mimetype: 'audio/ogg; codecs=opus',
            ptt: true,
            fileName: 'voice_note.ogg',
            contextInfo: newsletterContext()
        }, { quoted: m });
        
    } catch (e) {
        console.error('To PTT error:', e);
        reply(`❌ *Failed to convert:* ${e.message || 'Unknown error'}`);
    }
    break;
}
// ═══════════════════════════════════════════════════
// SETGCNAME - Set group name
// ═══════════════════════════════════════════════════
case 'setgcname':
case 'setsubject':
case 'setname': {
    if (!isGroup) return reply("👥 Group only!");
    if (!isCreator && !isAdmins) return reply("❌ Admins only!");
    if (!text) return reply(`Usage: ${prefix}setgcname <new group name>`);
    try {
        await empire.groupUpdateSubject(m.chat, text);
        reply(`✅ *Group name updated to:*\n\n${text}`);
    } catch (e) {
        reply(`❌ Failed to update name: ${e.message}`);
    }
    break;
}

case 'savestatus':
case 'sstatus':
case 'getstatus':
case 'save': {
    if (!isCreator) return m.reply('❌ *Only owner fit use this.*');
    if (!m.quoted) return m.reply('📌 *Reply to any status with:*\n.save\n\nMake you view person status then reply am with .save');

    try {
        const quoted = m.quoted;
        let qmsg = quoted.message || quoted.msg || {};
        if (qmsg.ephemeralMessage) qmsg = qmsg.ephemeralMessage.message;
        if (qmsg.viewOnceMessage) qmsg = qmsg.viewOnceMessage.message;
        if (qmsg.viewOnceMessageV2) qmsg = qmsg.viewOnceMessageV2.message;
        if (qmsg.viewOnceMessageV2Extension) qmsg = qmsg.viewOnceMessageV2Extension.message;

        const type = Object.keys(qmsg || {}).find(k => k.endsWith('Message')) || Object.keys(qmsg || {})[0] || '';
        const mediaNode = (type && qmsg[type]) ? qmsg[type] : null;
        const mime = (mediaNode && mediaNode.mimetype) || quoted.mimetype || '';
        const sender = quoted.participant || quoted.sender || quoted.key?.participant || 'Unknown';
        const senderName = String(sender).split('@')[0];
        const saveCaption = `✅ *STATUS SAVED*\n\n👤 From: @${senderName}\n📂 Type: ${String(type).replace('Message', '') || 'media'}\n⏰ ${new Date().toLocaleString()}`;

        let buffer = null;
        try {
            buffer = await empire.downloadMediaMessage(quoted);
        } catch {
            try { buffer = await quoted.download?.(); } catch { buffer = null; }
        }

        // Detect type from mime / keys / magic bytes so video never becomes a PDF
        const isImage = /image/i.test(mime) || /image/i.test(type) || (buffer && buffer[0] === 0xFF && buffer[1] === 0xD8);
        const isVideo = /video/i.test(mime) || /video/i.test(type) || (buffer && buffer.length > 8 && buffer.toString('utf8', 4, 8) === 'ftyp');
        const isAudio = /audio|ptt|ogg|opus|mpeg/i.test(mime) || /audio|ptt/i.test(type);

        if (!buffer) {
            let textStatus = quoted.text || qmsg.conversation || qmsg.extendedTextMessage?.text || qmsg.imageMessage?.caption || qmsg.videoMessage?.caption || '';
            if (textStatus) {
                await empire.sendMessage(m.sender, { text: `📝 *SAVED TEXT STATUS*\n\n👤 From: @${senderName}\n\n${textStatus}\n\n${saveCaption}`, mentions: [sender] }, { quoted: m });
                return m.reply('✅ Text status don save go your DM');
            }
            return m.reply('❌ No media found for this status');
        }

        if (isImage) {
            await empire.sendMessage(m.sender, {
                image: buffer,
                caption: saveCaption,
                mentions: [sender],
                contextInfo: newsletterContext({ mentionedJid: [sender] })
            }, { quoted: m });
        } else if (isVideo) {
            await empire.sendMessage(m.sender, {
                video: buffer,
                mimetype: mime && /video/i.test(mime) ? mime : 'video/mp4',
                caption: saveCaption,
                mentions: [sender],
                contextInfo: newsletterContext({ mentionedJid: [sender] })
            }, { quoted: m });
        } else if (isAudio) {
            await empire.sendMessage(m.sender, {
                audio: buffer,
                mimetype: mime || 'audio/mp4',
                ptt: /ptt|ogg|opus/i.test(mime) || /ptt/i.test(type),
                contextInfo: newsletterContext()
            }, { quoted: m });
            await empire.sendMessage(m.sender, { text: saveCaption, mentions: [sender], contextInfo: newsletterContext({ mentionedJid: [sender] }) });
        } else {
            // Last resort: still try video then image before document
            try {
                await empire.sendMessage(m.sender, {
                    video: buffer,
                    mimetype: 'video/mp4',
                    caption: saveCaption,
                    mentions: [sender],
                    contextInfo: newsletterContext({ mentionedJid: [sender] })
                }, { quoted: m });
            } catch {
                try {
                    await empire.sendMessage(m.sender, {
                        image: buffer,
                        caption: saveCaption,
                        mentions: [sender],
                        contextInfo: newsletterContext({ mentionedJid: [sender] })
                    }, { quoted: m });
                } catch {
                    const ext = (mime && mime.split('/')[1]) || 'bin';
                    await empire.sendMessage(m.sender, {
                        document: buffer,
                        mimetype: mime || 'application/octet-stream',
                        fileName: `status_${Date.now()}.${ext}`,
                        caption: saveCaption,
                        mentions: [sender],
                        contextInfo: newsletterContext({ mentionedJid: [sender] })
                    }, { quoted: m });
                }
            }
        }

        await m.reply('✅ *Status don save go your DM*');

    } catch (e) {
        console.error('SAVESTATUS ERROR:', e);
        m.reply(`❌ Failed to save status:\n${e.message}`);
    }
    break;
}


case 'bible':
case 'verse':
case 'bibleverse':
case 'kjv': {
    if (!text) return reply(`📖 *Bible Verse Lookup*\n\n📌 *Usage:*\n${prefix}bible <book chapter:verse>\n\n📝 *Examples:*\n ${prefix}bible John 3:16\n${prefix}bible Psalm 23:1\n ${prefix}bible Genesis 1:1\n${prefix}bible Romans 8:28\n\n💡 Also accepts:\n ${prefix}bible John 3:16-18 (range)\n${prefix}bible Psalm 23 (whole chapter)`);
    
    try {
        await empire.sendMessage(m.chat, { react: { text: '📖', key: m.key } });
        
        const axios = require('axios');
        const { data } = await axios.get('https://bible-api.com/' + encodeURIComponent(text), {
            timeout: 15000,
            headers: { 'User-Agent': 'VICO-XMD/3.0' }
        });

        if (!data?.text) {
            return reply(`❌ No Bible verse found for "${text}"\n\nTry a format like: John 3:16`);
        }

        const ref = data.reference || text;
const translation = data.translation_name || data.translation_id || 'KJV';
let response = `📖 *${ref}*\n_${translation}_\n\n${String(data.text).trim()}`;

if (data.verses && data.verses.length > 1) {
    response = `📖 *${ref}*\n_${translation}_\n\n`;
    for (const v of data.verses) {
        response += `*${v.verse}.* ${String(v.text).trim()}\n`;
    }
}

response += `\n\n🔗 ${data.reference || ''}`;

await empire.sendMessage(m.chat, {
    text: response.slice(0, 4000),
    contextInfo: {
        forwardingScore: 999,
        isForwarded: true
    }
}, { quoted: m });

        await empire.sendMessage(m.chat, { react: { text: '✅', key: m.key } });
    } catch (e) {
        console.error('[bible]', e.message);
        reply(`❌ Could not fetch the verse.\n\nCheck your format: ${prefix}bible John 3:16`);
        await empire.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});
    }
    break;
}

case 'gcstatus':
case 'gcs':
case 'groupstatus':
case 'poststatus':
case 'gcstory':
case 'togcstatus': {
    if (!m.isGroup) return reply('❌ Use this command inside a group.');

    const args = text ? text.trim().split(/\s+/) : [];
    const sub = (args[0] || '').toLowerCase();
    const caption = args.slice(1).join(' ').trim();

    // ─── HELP ───────────────────────────────────────────────
    if (['help', 'h', 'menu', ''].includes(sub) && !m.quoted) {
        return reply(`📱 *GCSTATUS — ADVANCED*\n\n` +
            `📌 *Basic Commands:*\n` +
            `• ${prefix}gcstatus Hello world! — Post text status\n` +
            `• [reply media] ${prefix}gcstatus caption — Post media status\n` +
            `📅 *Schedule & Repeat:*\n` +
            `• ${prefix}gcstatus schedule 10m Hello\n` +
            `• ${prefix}gcstatus repeat 5m Hello\n` +
            `• ${prefix}gcstatus delete <id>\n` +
            `• ${prefix}gcstatus list\n\n` +
            `⚙️ *Settings:*\n` +
            `• ${prefix}gcstatus bg #FF5733\n` +
            `• ${prefix}gcstatus font bold\n\n` +
            `📦 *Templates:*\n` +
            `• ${prefix}gcstatus template quote Hello\n` +
            `• ${prefix}gcstatus template announce Hello\n\n` +
            `📊 *Others:*\n` +
            `• ${prefix}gcstatus stats\n` +
            `• ${prefix}gcstatus clear\n\n` +
            `✅ *Works in ANY group — no admin needed!*`);
    }

    try {
        const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
        const fs = require('fs');
        const path = require('path');
        const os = require('os');
        const { exec } = require('child_process');

        // ─── HELPER: postStatus ───────────────────────────────
        async function postStatus(content) {
            if (!global.statusCount) global.statusCount = 0;
            global.statusCount++;

            if (content.text) {
                if (!global.statusTextCount) global.statusTextCount = 0;
                global.statusTextCount++;
            } else if (content.image || content.video) {
                if (!global.statusMediaCount) global.statusMediaCount = 0;
                global.statusMediaCount++;
            } else if (content.audio) {
                if (!global.statusAudioCount) global.statusAudioCount = 0;
                global.statusAudioCount++;
            }

            const statusSourceType =
                content.text ? 'TEXT' :
                content.image ? 'IMAGE' :
                content.video ? 'VIDEO' :
                content.audio ? 'AUDIO' : 'TEXT';

            return empire.sendMessage(m.chat, {
                ...content,
                contextInfo: {
                    ...(content.contextInfo || {}),
                    isGroupStatus: true,
                    statusSourceType,
                    statusAttributions: [{ type: 10 }],
                    statusAudienceMetadata: {
                        audienceType: 'CLOSE_FRIENDS'
                    }
                }
            });
        }

        // ─── SUB: schedule ───────────────────────────────────
        if (['schedule', 'sch'].includes(sub)) {
            const time = args[1] || '';
            const txt = args.slice(2).join(' ') || '';
            const match = time.match(/^(\d+)([smhd])$/);
            if (!match) return reply(`❌ Format: ${prefix}gcstatus schedule 10m Hello\n\nUnits: s=seconds, m=minutes, h=hours, d=days`);

            const amount = parseInt(match[1]);
            const unit = match[2];
            const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
            const delay = amount * multipliers[unit];
            const scheduleId = Date.now().toString(36);

            if (!global.scheduledPosts) global.scheduledPosts = [];
            const scheduleData = { id: scheduleId, jid: m.chat, text: txt, time: Date.now() + delay, active: true };
            global.scheduledPosts.push(scheduleData);

            setTimeout(async () => {
                if (scheduleData.active) {
                    await postStatus({ text: txt, backgroundColor: '#9C27B0' });
                    scheduleData.active = false;
                }
            }, delay);

            return reply(`✅ Status scheduled!\n\n📝 *Text:* ${txt}\n⏱️ *Time:* ${amount} \){unit} from now\n🆔 *ID:* ${scheduleId}`);
        }

        // ─── SUB: repeat ─────────────────────────────────────
        if (['repeat', 'rep'].includes(sub)) {
            const time = args[1] || '';
            const txt = args.slice(2).join(' ') || '';
            const match = time.match(/^(\d+)([smhd])$/);
            if (!match) return reply(`❌ Format: ${prefix}gcstatus repeat 5m Hello`);

            const amount = parseInt(match[1]);
            const unit = match[2];
            const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
            const interval = amount * multipliers[unit];
            const repeatId = Date.now().toString(36);

            if (!global.repeatPosts) global.repeatPosts = [];
            const repeatData = { id: repeatId, jid: m.chat, text: txt, interval, active: true };
            global.repeatPosts.push(repeatData);

            const runRepeat = async () => {
                if (!repeatData.active) return;
                await postStatus({ text: txt, backgroundColor: '#9C27B0' });
                setTimeout(runRepeat, interval);
            };
            runRepeat();

            return reply(`✅ Status repeating!\n\n📝 *Text:* ${txt}\n⏱️ *Interval:* Every ${amount} \){unit}\n🆔 *ID:* ${repeatId}`);
        }

        // ─── SUB: delete ─────────────────────────────────────
        if (['delete', 'del', 'remove'].includes(sub)) {
            const id = args[1] || '';
            if (!id) return reply(`❌ Usage: ${prefix}gcstatus delete <id>\n\nUse ${prefix}gcstatus list to see IDs.`);

            let deleted = false;
            if (global.scheduledPosts) {
                const index = global.scheduledPosts.findIndex(p => p.id === id);
                if (index !== -1) {
                    global.scheduledPosts[index].active = false;
                    global.scheduledPosts.splice(index, 1);
                    deleted = true;
                }
            }
            if (global.repeatPosts) {
                const index = global.repeatPosts.findIndex(p => p.id === id);
                if (index !== -1) {
                    global.repeatPosts[index].active = false;
                    global.repeatPosts.splice(index, 1);
                    deleted = true;
                }
            }
            return reply(deleted ? `✅ Post ${id} deleted!` : `❌ Post ${id} not found.`);
        }

        // ─── SUB: list ───────────────────────────────────────
        if (['list', 'ls', 'history'].includes(sub)) {
            let msg = '📋 *SCHEDULED POSTS*\n\n';
            if (global.scheduledPosts?.length) {
                const active = global.scheduledPosts.filter(p => p.active);
                msg += `📅 *Scheduled (${active.length}):*\n`;
                active.forEach(p => {
                    const remaining = Math.max(0, Math.floor((p.time - Date.now()) / 1000));
                    msg += `• \`${p.id}\` — " \){(p.text || '').slice(0, 30)}..." (${remaining}s left)\n`;
                });
            } else {
                msg += '📅 No scheduled posts.\n';
            }
            msg += '\n';
            if (global.repeatPosts?.length) {
                const active = global.repeatPosts.filter(p => p.active);
                msg += `🔄 *Repeating (${active.length}):*\n`;
                active.forEach(p => {
                    const interval = Math.floor(p.interval / 1000);
                    msg += `• \`${p.id}\` — " \){(p.text || '').slice(0, 30)}..." (every ${interval}s)\n`;
                });
            } else {
                msg += '🔄 No repeating posts.';
            }
            return reply(msg);
        }

        // ─── SUB: stats ──────────────────────────────────────
        if (['stats', 'stat'].includes(sub)) {
            return reply(`📊 *GCSTATUS STATS*\n\n` +
                `📝 Total posts: *${global.statusCount || 0}*\n` +
                `📄 Text posts: *${global.statusTextCount || 0}*\n` +
                `🖼️ Media posts: *${global.statusMediaCount || 0}*\n` +
                `🎵 Audio posts: *${global.statusAudioCount || 0}*\n\n` +
                `📅 Scheduled: *${global.scheduledPosts?.filter(p => p.active).length || 0}*\n` +
                `🔄 Repeating: *${global.repeatPosts?.filter(p => p.active).length || 0}*`);
        }

        // ─── SUB: clear ──────────────────────────────────────
        if (['clear', 'reset'].includes(sub)) {
            global.scheduledPosts = [];
            global.repeatPosts = [];
            return reply('✅ All scheduled and repeating posts cleared!');
        }

        // ─── SUB: bg ─────────────────────────────────────────
        if (['bg', 'background'].includes(sub)) {
            const color = args[1] || '';
            if (!color.match(/^#[a-fA-F0-9]{6}$/)) return reply(`❌ Usage: ${prefix}gcstatus bg #FF5733\n\nValid hex: #RRGGBB`);
            if (!global.gcSettings) global.gcSettings = {};
            if (!global.gcSettings[m.chat]) global.gcSettings[m.chat] = {};
            global.gcSettings[m.chat].bgColor = color;
            return reply(`✅ Default background color set to ${color}!`);
        }

        // ─── SUB: font ───────────────────────────────────────
        if (['font', 'fonts'].includes(sub)) {
            const fonts = ['bold', 'italic', 'underline', 'normal'];
            const font = args[1] || '';
            if (!fonts.includes(font)) return reply(`❌ Available fonts: ${fonts.join(', ')}`);
            if (!global.gcSettings) global.gcSettings = {};
            if (!global.gcSettings[m.chat]) global.gcSettings[m.chat] = {};
            global.gcSettings[m.chat].font = font;
            return reply(`✅ Font set to ${font}!`);
        }

        // ─── SUB: template ───────────────────────────────────
        if (['template', 'temp', 'tpl'].includes(sub)) {
            const template = args[1] || '';
            const txt = args.slice(2).join(' ') || '';
            const templates = {
                quote: `"${txt}" — Someone`,
                announce: `📢 *ANNOUNCEMENT*\n\n${txt}`,
                warning: `⚠️ *WARNING*\n\n${txt}`,
                success: `✅ *SUCCESS*\n\n${txt}`,
                error: `❌ *ERROR*\n\n${txt}`,
                tip: `💡 *TIP*\n\n${txt}`,
                poll: `📊 *POLL*\n\n${txt}\n\nReply with:\n1️⃣ Option A\n2️⃣ Option B`
            };
            if (!templates[template]) return reply(`❌ Available templates: ${Object.keys(templates).join(', ')}`);
            await postStatus({ text: templates[template], backgroundColor: '#9C27B0' });
            return empire.sendMessage(m.chat, { react: { text: '✅', key: m.key } });
        }

        // ─── SUB: animate ────────────────────────────────────
        if (['animate', 'anim', 'gif'].includes(sub)) {
            const txt = args.slice(1).join(' ') || '';
            if (!txt) return reply(`❌ Usage: ${prefix}gcstatus animate Hello World!`);
            const styles = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'];
            let count = 0;
            const interval = setInterval(async () => {
                if (count >= styles.length) return clearInterval(interval);
                await postStatus({ text: `${'🌟'.repeat(count + 1)} ${txt}`, backgroundColor: styles[count] });
                count++;
            }, 3000);
            return reply(`✅ Animating: "${txt}" ( \){styles.length} frames)`);
        }

        // ─── MAIN POST (text or media) ───────────────────────
        const quoted = m.quoted ? m.quoted : null;

        // Text status
        if (!quoted) {
            if (!text) return reply(`❌ Usage: ${prefix}gcstatus <text>\nOr reply to media with ${prefix}gcstatus`);

            const colorMatch = text.match(/--color=([#a-fA-F0-9]{6})/);
            const bgColor = colorMatch ? colorMatch[1] : (global.gcSettings?.[m.chat]?.bgColor || '#9C27B0');
            const cleanText = text.replace(/--color=#[a-fA-F0-9]{6}/, '').trim();

            await postStatus({ text: cleanText, backgroundColor: bgColor });
            return empire.sendMessage(m.chat, { react: { text: '✅', key: m.key } });
        }

        // Media status
        const mediaType = quoted.mimetype?.includes('image') ? 'image' :
                          quoted.mimetype?.includes('video') ? 'video' :
                          quoted.mimetype?.includes('audio') ? 'audio' : null;

        if (!mediaType) return reply('❌ Reply to an image, video, audio or voice note.');

        const buffer = await quoted.download();
        if (!buffer?.length) throw new Error('Downloaded media is empty');

        // Audio → voice note
        if (mediaType === 'audio') {
            // Simple version (no waveform for now to keep it lighter)
            await postStatus({
                audio: buffer,
                mimetype: 'audio/ogg; codecs=opus',
                ptt: true
            });
            return empire.sendMessage(m.chat, { react: { text: '🎵', key: m.key } });
        }

        // Image / Video
        let finalBuffer = buffer;
        if (mediaType === 'image') {
            try {
                const sharp = require('sharp');
                let img = sharp(buffer);
                if (args.includes('--blur')) img = img.blur(5);
                if (args.includes('--grayscale')) img = img.grayscale();
                if (args.includes('--sepia')) img = img.tint({ r: 112, g: 66, b: 20 });
                finalBuffer = await img.toBuffer();
            } catch {}
        }

        await postStatus({
            [mediaType]: finalBuffer,
            caption: caption || ''
        });

        await empire.sendMessage(m.chat, { react: { text: '✅', key: m.key } });

    } catch (e) {
        console.error('[GCSTATUS]', e);
        reply(`❌ Group status failed: ${e.message || e}`);
    }
    break;
}

case 'quran':
case 'ayah':
case 'ayat':
case 'surah': {
    if (!text) return reply(`📖 *Quran Verse Lookup*\n\n📌 *Usage:*\n${prefix}quran <surah:ayah>\n\n📝 *Examples:*\n ${prefix}quran 2:255\n${prefix}quran 1:1\n ${prefix}quran 36:1\n${prefix}quran 112:1\n\n💡 Also accepts:\n ${prefix}quran 2 255\n${prefix}quran 18:1-5 (range)`);

    try {
        await empire.sendMessage(m.chat, { react: { text: '📖', key: m.key } });

        const axios = require('axios');

        // Clean input (support both 2:255 and 2 255)
        let query = text.trim().replace(/\s+/g, ':');

        // Fetch Arabic + English Sahih International
        const { data } = await axios.get(`https://api.alquran.cloud/v1/ayah/${encodeURIComponent(query)}/editions/quran-uthmani,en.sahih`, {
            timeout: 15000
        });

        if (!data?.data || data.code !== 200) {
            return reply(`❌ No verse found for "${text}"\n\nTry a format like: 2:255 or 1:1`);
        }

        // data.data is an array when multiple editions are requested
        const arabic = data.data[0];
        const english = data.data[1];

        const surahName = arabic.surah.englishName;
        const surahNameAr = arabic.surah.name;
        const ayahNumber = arabic.numberInSurah;
        const surahNumber = arabic.surah.number;

        let response = `📖 *${surahName}* ( \){surahNameAr})\n` +
                       `*Surah ${surahNumber} : Ayah ${ayahNumber}*\n\n` +
                       `*Arabic:*\n${arabic.text}\n\n` +
                       `*Translation (Sahih International):*\n${english.text}`;

        await empire.sendMessage(m.chat, {
            text: response.slice(0, 4000),
            contextInfo: {
                forwardingScore: 999,
                isForwarded: true
            }
        }, { quoted: m });

        await empire.sendMessage(m.chat, { react: { text: '✅', key: m.key } });
    } catch (e) {
        console.error('[quran]', e.message);
        reply(`❌ Could not fetch the verse.\n\nCheck your format: ${prefix}quran 2:255`);
        await empire.sendMessage(m.chat, { react: { text: '❌', key: m.key } }).catch(() => {});
    }
    break;
}

case 'cool':
case '❤️❤️':
case 'vv2': {
    if (!m.quoted) return reply('✠ Reply to an image or video');

    const quoted = m.quoted;
    const mime = quoted.mimetype || '';

    if (!mime.startsWith('image/') && !mime.startsWith('video/')) {
        return reply('✠ Only image or video supported');
    }

    try {
        await reply('⏳ *Downloading media...*');

        const mediaBuffer = await empire.downloadMediaMessage(quoted);

        if (!mediaBuffer || mediaBuffer.length < 100) {
            return reply('✠ Failed to download media');
        }

        if (mime.startsWith('image/')) {
            await empire.sendMessage(m.sender, {
                image: mediaBuffer,
                caption: quoted.caption || '✠ Photo download by 𝐕𝐈𝐂𝐎 𝐗𝐌𝐃 𓉳',
                contextInfo: newsletterContext()
            });
        } else {
            await empire.sendMessage(m.sender, {
                video: mediaBuffer,
                caption: quoted.caption || '✠ Video download by 𝐕𝐈𝐂𝐎 𝐗𝐌𝐃 𓉳',
                contextInfo: newsletterContext()
            });
        }

        reply('Alright');
    } catch (e) {
        console.error('cool error:', e);
        reply('✠ Failed to download or send media');
    }
    break;
}

case '❤️❤️❤️':
case '❤️':
case 'viewonce':
case 'vv':
case 'reveal': {
    if (!isCreator) return reply('❌ Owner only!');
    
    try {
        // Extract quoted message from various possible locations
        const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage ||
                       m.quoted?.message ||
                       m.message;
        
        if (!quoted) {
            await reply('👁️ *Usage:* Reply to a view-once message with `.viewonce`\n\nThe bot will reveal and forward it to your DM.');
            break;
        }
        
        // Check for view-once message types
        let mediaContent = null;
        let mediaType = null;
        let isViewOnce = false;
        
        // Check all possible view-once message structures
        const viewOnceKeys = ['viewOnceMessage', 'viewOnceMessageV2', 'viewOnceMessageV2Extension'];
        let viewOnceMsg = null;
        
        for (const key of viewOnceKeys) {
            if (quoted[key]) {
                viewOnceMsg = quoted[key];
                break;
            }
        }
        
        // If view-once wrapper found, extract inner message
        if (viewOnceMsg) {
            let innerMsg = viewOnceMsg.message || viewOnceMsg;
            if (viewOnceMsg.viewOnceMessageV2Extension) {
                innerMsg = viewOnceMsg.viewOnceMessageV2Extension;
            }
            if (innerMsg.message) {
                innerMsg = innerMsg.message;
            }
            
            // Check for media in inner message
            const mediaTypes = ['imageMessage', 'videoMessage', 'audioMessage', 'documentMessage', 'stickerMessage'];
            for (const type of mediaTypes) {
                if (innerMsg[type]) {
                    mediaContent = innerMsg[type];
                    mediaType = type;
                    isViewOnce = true;
                    break;
                }
            }
        }
        
        // If no view-once wrapper, check for regular media with viewOnce flag
        if (!isViewOnce) {
            const mediaTypes = ['imageMessage', 'videoMessage', 'audioMessage', 'documentMessage', 'stickerMessage'];
            for (const type of mediaTypes) {
                if (quoted[type] && quoted[type].viewOnce === true) {
                    mediaContent = quoted[type];
                    mediaType = type;
                    isViewOnce = true;
                    break;
                }
            }
        }
        
        // Also check if the quoted message itself is a media with viewOnce flag
        if (!isViewOnce) {
            const msg = quoted;
            const mediaTypes = ['imageMessage', 'videoMessage', 'audioMessage', 'documentMessage', 'stickerMessage'];
            for (const type of mediaTypes) {
                if (msg[type] && msg[type].viewOnce === true) {
                    mediaContent = msg[type];
                    mediaType = type;
                    isViewOnce = true;
                    break;
                }
            }
        }
        
        if (!isViewOnce || !mediaContent) {
            await reply('❌ No view-once media found. Please reply to a view-once image, video, audio, or sticker.');
            break;
        }
        
        await reply('📥 *Revealing view-once media...*');
        
        // Download the media
        const mediaTypeName = mediaType.replace('Message', '').toLowerCase();
        const stream = await downloadContentFromMessage(mediaContent, mediaTypeName);
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }
        
        if (!buffer || buffer.length === 0) {
            await reply('❌ Failed to download media. The file may be corrupted or expired.');
            break;
        }
        
        // Get file info
        const mimeType = mediaContent.mimetype || 'application/octet-stream';
        const extension = mimeType.split('/')[1]?.split(';')[0] || 'bin';
        const fileName = `viewonce_${Date.now()}.${extension}`;
        const caption = mediaContent.caption || '';
        
        // Get sender info
        const sender = m.quoted?.sender || m.sender || 'Unknown';
        const senderName = sender.split('@')[0];
        
        const revealCaption = `👁️ *View-Once Revealed*\n\n📤 *From:* @${senderName}\n📂 *Type:* ${mediaType.replace('Message', '')}\n🕐 *Time:* ${new Date().toLocaleString()}\n${caption ? `📝 *Caption:* ${caption}` : ''}\n\n🔒 *Original was view-once*`;
        
        // Get owner JID
        const ownerJid = owner[0] || botNumber;
        const ownerNum = ownerJid.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
        
        // ─── Send to current chat ───
        const sendOptions = { quoted: m, mentions: [sender] };
        
        if (mediaType === 'imageMessage') {
            await empire.sendMessage(m.chat, { 
                image: buffer, 
                caption: revealCaption,
                contextInfo: newsletterContext({ mentionedJid: [sender] })
            }, sendOptions);
        } else if (mediaType === 'videoMessage') {
            await empire.sendMessage(m.chat, { 
                video: buffer, 
                caption: revealCaption,
                contextInfo: newsletterContext({ mentionedJid: [sender] })
            }, sendOptions);
        } else if (mediaType === 'audioMessage') {
            await empire.sendMessage(m.chat, { 
                audio: buffer, 
                mimetype: mimeType,
                fileName: fileName,
                caption: revealCaption,
                contextInfo: newsletterContext({ mentionedJid: [sender] })
            }, sendOptions);
        } else if (mediaType === 'documentMessage') {
            await empire.sendMessage(m.chat, { 
                document: buffer, 
                mimetype: mimeType,
                fileName: fileName,
                caption: revealCaption,
                contextInfo: newsletterContext({ mentionedJid: [sender] })
            }, sendOptions);
        } else if (mediaType === 'stickerMessage') {
            await empire.sendMessage(m.chat, { 
                sticker: buffer,
                caption: revealCaption,
                contextInfo: newsletterContext({ mentionedJid: [sender] })
            }, sendOptions);
        } else {
            // Fallback: send as document
            await empire.sendMessage(m.chat, { 
                document: buffer, 
                mimetype: mimeType,
                fileName: fileName,
                caption: revealCaption,
                contextInfo: newsletterContext({ mentionedJid: [sender] })
            }, sendOptions);
        }
        
        // ─── Forward a copy to owner's DM ───
        if (ownerNum && ownerNum !== m.chat) {
            try {
                const ownerCaption = `📥 *View-Once Forwarded*\n\n📤 *From:* @${senderName}\n📂 *Type:* ${mediaType.replace('Message', '')}\n🕐 *Time:* ${new Date().toLocaleString()}\n🔗 *Original Chat:* ${m.chat}`;
                
                if (mediaType === 'imageMessage') {
                    await empire.sendMessage(ownerNum, { 
                        image: buffer, 
                        caption: ownerCaption, 
                        mentions: [sender],
                        contextInfo: newsletterContext({ mentionedJid: [sender] })
                    });
                } else if (mediaType === 'videoMessage') {
                    await empire.sendMessage(ownerNum, { 
                        video: buffer, 
                        caption: ownerCaption, 
                        mentions: [sender],
                        contextInfo: newsletterContext({ mentionedJid: [sender] })
                    });
                } else if (mediaType === 'audioMessage') {
                    await empire.sendMessage(ownerNum, { 
                        audio: buffer, 
                        mimetype: mimeType, 
                        fileName, 
                        caption: ownerCaption, 
                        mentions: [sender],
                        contextInfo: newsletterContext({ mentionedJid: [sender] })
                    });
                } else if (mediaType === 'stickerMessage') {
                    await empire.sendMessage(ownerNum, { 
                        sticker: buffer, 
                        caption: ownerCaption, 
                        mentions: [sender],
                        contextInfo: newsletterContext({ mentionedJid: [sender] })
                    });
                } else {
                    await empire.sendMessage(ownerNum, { 
                        document: buffer, 
                        mimetype: mimeType, 
                        fileName, 
                        caption: ownerCaption, 
                        mentions: [sender],
                        contextInfo: newsletterContext({ mentionedJid: [sender] })
                    });
                }
            } catch (e) {
                console.error('Failed to forward to owner:', e);
            }
        }
        
    } catch (e) {
        console.error('ViewOnce error:', e);
        await reply(`❌ Failed to reveal view-once: ${e.message || 'Unknown error'}`);
    }
    break;
}

case 'yarn':
case 'gist':
case 'proverb': {
 let yarns = [
  "No be who first call police dey win case.",
  "If you no get money, hide your face... your village people dey see you.",
  "Rat wey follow lizard enter rain, na sickness e go get.",
  "Life na turn by turn, today na your own, tomorrow na my own.",
  "No dey use electricity take play with NEPA office.",
  "Who no go no know, make you japa make you see.",
  "You dey whine me ni? I no be Indomie.",
  "No lele, hustle dey pay but e no dey show for face.",
  "Pikin wey say him mama no go sleep, him self no go sleep.",
  "If you chop alone, you go purge alone.",
  "Shege don show you small you don dey shout, na just intro be this.",
  "Water wey no reach you for back, no suppose reach you for front.",
  "You no fit use style take dodge karma.",
  "Even for hell, some people go still dey price firewood.",
  "Person wey dey find trouble go see am even for church.",
  "No be every japa na success, some na escape.",
  "If you dey borrow cloth dey do big boy, rain go disgrace you.",
  "Goat wey dey for party, no know say dem dey use am do asun.",
  "Empty drum dey make loudest noise.",
  "If e never tey, e no fit tey.",
  "Person wey no get work no dey get weekend.",
  "If you follow dog chop, you go follow am bark.",
  "Na who give up na him lose.",
  "If you dey fear village people, you no go ever blow.",
  "Hustle wey no get holiday, na money go pay am.",
  "No be every smile na love, some na format.",
  "If you see person wey fine pass you, na filter.",
  "Friend wey dey ask you money every week, na subscription.",
  "If you no sabi road, ask person wey don waka am.",
  "Man wey get data no dey lonely.",
  "No trust all these I love you for DM, na data remain.",
  "Girl wey love you no go stress you, she go bill you small small.",
  "Boy wey get sense no dey shout, e dey show workings.",
  "If you see girl dey reply fast, na two things - she like you or she need something.",
  "No be every sorry be from heart, some na just to escape slap.",
  "If your guy no dey show for your low, no carry am enter your high.",
  "Life no hard, na people inside am na him hard.",
  "If you no get money, even your shadow go leave you for sun.",
  "Everybody na boss till money enter matter.",
  "No dey form big man if your account dey whisper.",
  "If you wan know who love you, no get money for one week.",
  "Respect no dey for empty pocket.",
  "If you dey do good, do am make e loud - make your enemy vex.",
  "No dey explain yourself to person wey don decide to misunderstand you.",
  "If you want peace, no dey follow gossip group.",
  "Person wey talk too much no fit keep secret.",
  "If you see snake for your friend farm, no be your business till e enter your own.",
  "Patience get limit, na why tap get head.",
  "You no fit shine if you dey fear darkness.",
  "If you never chop breakfast, no dey advise person wey don chop dinner.",
  "No be every closed eye na sleep, some na plan.",
  "If you too dey available, dem go take you for granted.",
  "Loyalty no be for mouth, na for action.",
  "If person leave you for your worst, no carry am enter your best.",
  "No be everybody wey laugh with you like you.",
  "If you wan know your true guy, watch am when you no get shishi.",
  "Small body no be sickness, na packaging.",
  "If you dey carry person for mind wey no carry you, na overload.",
  "No dey beg for love, beg for money - love go come later.",
  "If she no dey call you, you no be priority - you be option.",
  "You fit fake lifestyle, you no fit fake peace of mind.",
  "If you no get joy, no spoil another person own.",
  "Wahala be like bicycle, e no dey finish.",
  "If you want make dem rate you, no dey beg for rating.",
  "Make you no dey do pass yourself because of Instagram.",
  "If you dey compare yourself with others, you no go ever happy.",
  "Na who get mind dey flex, no be who get money pass.",
  "If your prayer no work, try work too.",
  "God dey, but make you still lock your door for night.",
  "If you too dey trust, dem go use you.",
  "Person wey say money no be everything, na because e no get am.",
  "If you see free thing for Naija, run - na trap.",
  "Naija no hard, na you dey use style dodge work.",
  "If Nepa no take light, you no go know value of light.",
  "Police na your friend, till you get issue.",
  "If you no sabi price, enter market with person wey sabi.",
  "BRT fit leave you, but your leg no go leave you.",
  "If you dey waka for Lagos and you no look left and right, na danfo go teach you.",
  "No dey play with Lagos agbero, e get why dem dey road.",
  "If you no get thick skin for Lagos, you no go survive.",
  "Na person wey hold ladder na him dey fall most.",
  // EXTRA 20 HOT NEW YARNS
  "No be every mad man dey for Yaba, some dey for comment section.",
  "If you no get VICO XMD for your group, your group still dey for stone age.",
  "No be who get big head get sense, some na just big hat dem dey wear.",
  "Chicken wey dey run for day, na night e go enter pot.",
  "If you dey reason another man downfall, your own upfall no go show.",
  "No be every loud person get point, some just get data.",
  "If you see tortoise for fence, person put am there.",
  "Money na water, if you no fetch am, you go dey thirsty.",
  "Person wey dey laugh you today, go beg you tomorrow.",
  "If breeze blow, fowl yansh go open - no secret forever.",
  "Na who no dey fear to fall na him go fit climb high.",
  "If you carry person for head, e go want climb go sky.",
  "No be every shine na gold, some na foil paper.",
  "If you want make your enemy cry, focus on your own success.",
  "No dey promise for night wetin you no fit do for day.",
  "If you too dey shine, dem go use torchlight find your secret.",
  "Person wey don chop belleful na him dey talk say food no sweet.",
  "Na person wey hold microphone na him dey control crowd.",
  "If you no sabi how to waka for water, you no go fit swim for river.",
  "If you follow person wey no sabi road, you go miss bus stop."
 ]

 let pick = yarns[Math.floor(Math.random() * yarns.length)]
 await m.reply(`┏━━ *VICO XMD YARN* ━━┓\n┃\n┃ 🗣️ ${pick}\n┃\n┗━━━━━━━━━━━━┛`)
 break
}

// ═══════════════════════════════════════════════════
// SAVESTATUS - Simple instant save
// ═══════════════════════════════════════════════════

case 'dare': {
    const dares = [
        "Send your last-used emoji in the chat.",
        "Type your full name backwards.",
        "Send a 5-word compliment to the person above you.",
        "Change your WhatsApp status to 'I love VICO XMD' for 10 minutes.",
        "Send a voice note saying 'I am a mumu' in Nigerian accent.",
        "Mention 3 people in this group and say something nice about them.",
        "Send the most recent photo in your gallery (safe one).",
        "Text your crush 'I have something important to tell you' then leave them hanging.",
        "Say the alphabet backwards in a voice note.",
        "Send a funny selfie right now.",
        "Write a short poem about the person who tagged you.",
        "Change your profile picture to a cartoon character for 30 minutes.",
        "Send a voice note singing any song (even if your voice is bad).",
        "Type with your elbow for the next 3 messages.",
        "Tell a very bad joke in the group.",
        "Send your battery percentage + current time.",
        "Mention your best friend in this group and say something nice about them.",
        "Send a random emoji story (at least 8 emojis).",
        "Write 'I am the best' 10 times without stopping.",
        "Send a voice note explaining why you are the most fine person here.",
        "Change your WhatsApp name to 'Captain Mumu' for 15 minutes.",
        "Send the last song you listened to.",
        "Tag the quietest person in the group and ask them a question.",
        "Send a message using only emojis.",
        "Pretend to be the group admin for 2 minutes (fun way).",
        "Send a tongue twister and try to say it in voice note.",
        "Confess one small embarrassing thing (keep it light).",
        "Send a random fact about yourself.",
        "Type your reply with your eyes closed (try it).",
        "Send a message as if you are a robot.",
        "Tag 2 people and create a funny ship name for them.",
        "Send a voice note saying the longest word you know.",
        "Write a fake WhatsApp status that sounds dramatic.",
        "Send the ugliest emoji combination you can make.",
        "Speak only in questions for your next 3 messages.",
        "Send a compliment to the person who least expects it.",
        "Change your about/status to a song lyric for 20 minutes.",
        "Send a voice note laughing for 10 seconds straight.",
        "Type a message with every word starting with the same letter.",
        "Mention someone and dare them back.",
        "Send a random number between 1 and 100 and explain why you chose it.",
        "Write a short story (3 lines) about this group.",
        "Send a message in full CAPS only.",
        "Pretend the next message is a secret and whisper it (voice note).",
        "Tag the most active person and thank them.",
        "Send a funny warning message to the group.",
        "Write your name using only emojis.",
        "Send a voice note doing an animal sound.",
        "Make a prediction about someone in the group.",
        "Send a message as if you are the bot itself.",
        "Type the national anthem first line (any country).",
        "Send a random pickup line to the group.",
        "Mention someone and give them a fake award.",
        "Send a message with at least 15 emojis.",
        "Speak like a news presenter in a voice note.",
        "Write a fake advertisement about yourself.",
        "Send the time + your current mood in emojis.",
        "Tag someone and tell them a random fun fact.",
        "Send a message using only one letter of the alphabet repeatedly.",
        "Create a funny nickname for 3 people in the group.",
        "Send a voice note saying 'I am the chosen one'.",
        "Write a short motivational quote (make it up).",
        "Send a message as if you are angry (but funny).",
        "Mention the last person who messaged and compliment them.",
        "Send a random dare back to someone.",
        "Type a message without using the letter 'e'.",
        "Send a voice note counting from 1 to 20 very fast.",
        "Make a funny excuse for why you are online now.",
        "Send a message in Pidgin English only.",
        "Tag someone and ask them their biggest fear (fun way).",
        "Send a fake confession (keep it clean and funny).",
        "Write a 2-line rap about this group.",
        "Send the most random thing on your mind right now.",
        "Change your typing style for the next 5 minutes (example: add 'nya' at the end).",
        "Send a voice note saying a proverb you know.",
        "Mention two people and say they should be friends.",
        "Send a message that sounds like a conspiracy theory about the group.",
        "Type your next message with the opposite hand.",
        "Send a fun challenge to the whole group.",
        "Say something positive about yourself in a voice note.",
        "Send a random emoji and force others to interpret it.",
        "Write a fake news headline about someone here.",
        "Send a message as if you are whispering a secret.",
        "Tag the person you think is the funniest and tell them why.",
        "Send a short prayer or wish for the group (funny or serious).",
        "Make up a new rule for this group and announce it.",
        "Send a voice note trying to sound like a different gender.",
        "Write a message that must contain the word 'VICO' three times.",
        "Send a random question to the group and wait for answers.",
        "Pretend you just woke up and send a confused message.",
        "Send a compliment using only emojis + one word.",
        "Tag someone and dare them to send a voice note.",
        "Create a funny conspiracy about why this group exists.",
        "Send a message with inverted words (example: 'olleh' for hello).",
        "Say the name of everyone you can remember in this group (voice note).",
        "Send a dramatic entrance message as if you just joined.",
        "Write a short letter to your future self (2-3 lines).",
        "Send the funniest thing that happened to you this week (short).",
        "End your next 3 messages with 'periodt'.",
        "Send a voice note saying 'I go better your life' in Nigerian way."
    ];

    const dare = dares[Math.floor(Math.random() * dares.length)];
    reply(`🔥 *DARE*\n\n${dare}`);
    break;
}
// ═══════════════════════════════════════════════════
// DONATE - Show payment info
// ═══════════════════════════════════════════════════
case 'donate': {
    const donateText = `Support us please 🙏❤️ 

─「 🏦 ᴘᴀʏᴍᴇɴᴛ ɪɴғᴏ 」  
├─❏ ɴᴀᴍᴇ: ᴍᴀʀᴊᴀɴᴇ ɴɴᴀᴍᴅɪ
├─❏ ᴀᴄᴄ ɴᴏ: 9129873629
├─❏ ʙᴀɴᴋ: sᴍᴀʀᴛᴄᴀsʜ
└─❏ ᴅʀᴏᴘ sᴄʀᴇᴇɴsʜᴏᴛ ᴀғᴛᴇʀ ᴘᴀʏᴍᴇɴᴛ ✅`;
    
    reply(donateText);
    break;
}

// ═══════════════════════════════════════════════════
// SETAZA - Save user's bank details
// ═══════════════════════════════════════════════════
case 'setaza': {
    // Use `text` from command parser (works for single-line and multi-line)
    let input = (text || q || '').trim();
    if (!input) {
        input = (m.body || m.text || body || '').replace(/^\.?setaza\s*/i, '').trim();
    }

    if (!input) {
        return reply(
            `✠ *SET YOUR AZA*\n\n` +
            `*Format (single line):*\n` +
            `${prefix}setaza <account> <bank> <name>\n\n` +
            `*Example:*\n` +
            `${prefix}setaza 9187526272 Opay Ebuka Celeb\n\n` +
            `*Or multi-line:*\n` +
            `${prefix}setaza\n9187526272\nOpay\nEbuka Celeb`
        );
    }

    let accNo, bank, name;

    // Multi-line format
    if (input.includes('\n')) {
        const lines = input.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        if (lines.length < 3) {
            return reply('✠ Invalid format!\n\nNeed: Account Number, Bank, Account Name');
        }
        accNo = lines[0];
        bank = lines[1];
        name = lines.slice(2).join(' ');
    } else {
        // Single-line: .setaza 9187526272 Opay Ebuka Celeb
        const parts = input.split(/\s+/).filter(Boolean);
        if (parts.length < 3) {
            return reply(
                `✠ Invalid format!\n\n` +
                `*Use:*\n${prefix}setaza <account> <bank> <name>\n\n` +
                `*Example:*\n${prefix}setaza 9187526272 Opay Ebuka Celeb`
            );
        }
        accNo = parts[0];
        bank = parts[1];
        name = parts.slice(2).join(' ');
    }

    // Basic validation
    if (!/^\d{8,15}$/.test(accNo.replace(/\s/g, ''))) {
        return reply('✠ Account number must be 8–15 digits only.');
    }

    const dbAza = loadAzaDB();

    if (dbAza[m.sender]) {
        return reply(
            `⚠️ You already have bank details saved!\n\n` +
            `Use *${prefix}delaza* or *${prefix}removeaza* to delete the old one first.`
        );
    }

    dbAza[m.sender] = {
        accNo: accNo.replace(/\s/g, ''),
        bank: bank.trim(),
        name: name.trim()
    };
    saveAzaDB(dbAza);

    reply(
        `✅ *Bank details saved successfully!*\n\n` +
        `🏦 *BANK DETAILS*\n\n` +
        `😎 *${name.toUpperCase()}*\n` +
        `🔢 *${accNo.replace(/\s/g, '')}*\n` +
        `🟢 *${bank.toUpperCase()}*\n\n` +
        `*SEND SCREENSHOT AFTER PAYMENT*`
    );
    break;
}

// ═══════════════════════════════════════════════════
// AZA - Show saved bank details
// ═══════════════════════════════════════════════════
case 'aza': {
    const dbAza = loadAzaDB();
    const data = dbAza[m.sender];

    if (!data) {
        return reply('✠ Please set ur account number using .setaza');
    }

    const { accNo, bank, name } = data;

    reply(`🏦 *BANK DETAILS*

😎 *${name.toUpperCase()}*
🔢 *${accNo}*
🟢 *${bank.toUpperCase()}*

*SEND SCREENSHOT AFTER PAYMENT*`);
    break;
}

// ═══════════════════════════════════════════════════
// DELAZA / REMOVEAZA - Delete bank details
// ═══════════════════════════════════════════════════
case 'delaza':
case 'removeaza': {
    const dbAza = loadAzaDB();
    if (!dbAza[m.sender]) {
        return reply('✠ You don\'t have any bank details saved. Use .setaza to create one.');
    }
    delete dbAza[m.sender];
    saveAzaDB(dbAza);
    reply('✅ *Bank details deleted successfully!*\n\nYou can now create new one using .setaza');
    break;
}



case 'insult': {
    try {
        let userToInsult = m.mentionedJid?.[0] || (m.quoted ? m.quoted.sender : null);

        if (!userToInsult) {
            return reply(`❌ Mention someone or reply to their message.\nExample: ${prefix}insult @user`);
        }

        const insults = [
            "You this one, your head no correct at all!",
            "Omo you dey form busy but you no dey do anything.",
            "Your brain dey on airplane mode since morning.",
            "You resemble the kind person wey dey always miss the point.",
            "You this mumu, even your shadow dey shame you.",
            "Your sense don expire like pure water wey stay under sun.",
            "You dey talk as if your mouth no get control.",
            "You be the reason why they say 'look before you leap'.",
            "Your head dey carry heavy load of yeye thoughts.",
            "You this one, even your WiFi no gree connect to sense.",
            "You dey form, but your form no complete.",
            "Your life be like buffering video — always loading.",
            "You this person, your presence alone fit scatter joy.",
            "You resemble someone wey dem born without instruction manual.",
            "Your brain dey do lag anytime e matter.",
            "You this one, even google no fit find sense for your head.",
            "You dey always come first... for last place.",
            "Your own na special kind of mumu.",
            "You be walking red flag with legs.",
            "Your sense dey AWOL since last year.",
            "You this one, your mouth dey write cheque wey your brain no fit cash.",
            "Even your ancestors dey look you with pity.",
            "You resemble the kind person wey go miss free food.",
            "Your head no correct, and the evidence dey clear.",
            "You this mumu, you dey try hard but e no dey show.",
            "Your own level of dullness na international standard.",
            "You be the reason why silence is golden.",
            "Your brain take unpaid leave long time ago.",
            "You this one, even pure water get more value than your opinion.",
            "You dey form original but you be fake copy.",
            "Your life be like bad network — always frustrating.",
            "You this person, your common sense dey on vacation.",
            "Even your reflection dey avoid you for mirror.",
            "You resemble someone wey dem use for example of how not to live.",
            "Your own na premium mumu package.",
            "You dey talk nonsense with full confidence.",
            "Your head dey full of gala and pure water thoughts.",
            "You this one, your future dey fear you.",
            "You be the human version of 'error 404'.",
            "Your sense dey hide anytime e suppose show.",
            "You this mumu, even your shadow dey walk faster than your brain.",
            "Your contribution to any discussion na zero.",
            "You resemble the kind person wey go follow wrong crowd with full chest.",
            "Your own level of uselessness na talent.",
            "You dey always appear where dem no need you.",
            "Your brain capacity no reach this conversation.",
            "You this one, even street no gree claim you.",
            "Your life be like expired product — still dey shelf but no value.",
            "You dey form wise but your actions dey expose you.",
            "Your head no reach, and e no go ever reach.",
            "You this person, your presence dey reduce the IQ of the group.",
            "Even your name alone fit cause wahala.",
            "You resemble someone wey dem send to buy sense but e miss road.",
            "Your own na special edition of dullness.",
            "You dey always miss the main point by country mile.",
            "Your brain dey do selective work — only when e no matter.",
            "You this mumu, your confidence pass your ability.",
            "You be the reason why some people dey avoid group chat.",
            "Your sense dey on low battery permanently.",
            "You this one, even your mistakes get mistakes.",
            "Your contribution na just noise pollution.",
            "You resemble the kind person wey go argue with traffic light.",
            "Your own head na pure decoration.",
            "You dey try to shine but you be torchlight without battery.",
            "Your life be like bad movie — everybody wan skip.",
            "You this person, your common sense take French leave.",
            "Even the air around you dey heavier.",
            "You be walking example of 'wetin concern me'.",
            "Your brain dey strike more than ASUU.",
            "You this mumu, your thoughts dey always late.",
            "Your own na certified original dullard.",
            "You dey form soft but your head hard like stone.",
            "Your presence alone fit spoil good morning.",
            "You resemble someone wey dem use as warning sign.",
            "Your sense no reach to even know say e no reach.",
            "You this one, your future tense dey fear present tense.",
            "Your mouth dey run more than your brain.",
            "You be the human equivalent of 'please wait'.",
            "Your own level of confusion na art.",
            "You dey always bring low energy to high places.",
            "Even your excuses dey tired of you.",
            "You this person, your brain dey do remote work from another planet.",
            "Your contribution to progress na negative.",
            "You resemble the kind person wey go lose for free competition.",
            "Your head no correct, full stop.",
            "You this mumu, even your WiFi password get more sense.",
            "Your life be like loading screen wey no wan finish.",
            "You dey form main character but you be extra.",
            "Your own na pure side character energy.",
            "You this one, your thoughts dey need editor.",
            "Even your shadow dey ashamed to follow you.",
            "You be the reason why some people dey use 'block' button.",
            "Your sense dey always arrive after the party.",
            "You this person, your head na tourist attraction for confusion.",
            "Your own na limited edition of mumu.",
            "You dey always miss road even when map dey your hand.",
            "Your brain capacity no reach to process this insult.",
            "You this one, even pure water dey look you sideways.",
            "Your presence dey cause collective headache.",
            "You resemble someone wey dem born with factory reset button missing.",
            "Your own final answer na mumu."
        ];

        const insult = insults[Math.floor(Math.random() * insults.length)];

        await empire.sendMessage(m.chat, {
            text: `Hey @${userToInsult.split('@')[0]}, ${insult}`,
            mentions: [userToInsult],
            contextInfo: newsletterContext({ mentionedJid: [userToInsult] })
        }, { quoted: m });

    } catch (e) {
        console.error('Insult Error:', e);
        reply('❌ Failed to send the insult.');
    }
    break;
}

case 'compliment':
case 'compliments': {
    try {
        let userToCompliment = m.mentionedJid?.[0] || (m.quoted ? m.quoted.sender : null);

        if (!userToCompliment) {
            return reply(`❌ Mention someone or reply to their message.\nExample: ${prefix}compliment @user`);
        }

        const compliments = [
            // Nigerian flavored ones
            "Omo you this one, your vibe na correct level!",
            "Your smile fit light up whole Lagos traffic.",
            "You get sense pass many people wey dey form.",
            "Your energy na pure positive, no dulling.",
            "You this one, you dey make people happy just by showing face.",
            "Your kindness na something else, God go bless you.",
            "You get that soft life energy, I like am.",
            "Your brain dey sharp die, no be small.",
            "You na real one, no be by force.",
            "Your presence alone dey calm everywhere.",
            "You this person, you get good heart for real.",
            "Your laugh na pure medicine, keep am.",
            "You dey carry grace for your body.",
            "Your own level of coolness no be here.",
            "You make the group better just by dey around.",
            "Your sense of humor na top notch.",
            "You get that main character energy for real.",
            "Your loyalty strong pass many people.",
            "You this one, you dey inspire quiet quiet.",
            "Your vibe na expensive, no be everybody fit match am.",
            "You get soft heart but strong mind.",
            "Your presence dey make ordinary day better.",
            "You na the kind person wey people dey happy to see.",
            "Your energy dey contagious for good side.",
            "You this one, your future bright die.",
            "Your way of thinking na different level.",
            "You get that rare combination of brains and heart.",
            "Your smile alone fit end wahala.",
            "You na real gem for this life.",
            "Your own na pure original, no be copy.",

            // More general strong compliments
            "You have a beautiful soul that lights up every room.",
            "Your smile is contagious — keep spreading it.",
            "You're smarter than you give yourself credit for.",
            "The way you carry yourself is inspiring.",
            "You have such a warm and comforting energy.",
            "Your kindness makes the world better.",
            "You're one of those rare people who make everyone feel seen.",
            "Your sense of humor is pure gold.",
            "You have an amazing ability to make people feel comfortable.",
            "You're stronger than you realize.",
            "Your creativity never fails to impress.",
            "You have a heart of pure gold.",
            "The world needs more people like you.",
            "You light up every conversation.",
            "Your positive energy is addictive.",
            "You're incredibly thoughtful.",
            "You have a unique and beautiful perspective.",
            "Being around you just feels good.",
            "You make difficult days easier.",
            "Your presence is a gift.",
            "You have a natural talent for making people smile.",
            "You're more amazing than you know.",
            "Your determination is admirable.",
            "You have a gentle strength people respect.",
            "You're the kind of person everyone hopes to meet.",
            "Your laugh is one of the best sounds.",
            "You bring calm into chaotic moments.",
            "You're effortlessly cool.",
            "Your authenticity is refreshing.",
            "You make ordinary moments feel special.",
            "You have a mind that sees solutions others miss.",
            "Your energy is the kind people want around.",
            "You make people feel safe just by being yourself.",
            "Your honesty is rare and valuable.",
            "You have a quiet confidence that speaks volumes.",
            "You're the reason some people still believe in good humans.",
            "Your support means more than you know.",
            "You have a gift for making others feel important.",
            "Your presence alone improves any room.",
            "You're someone people feel lucky to know.",
            "Your resilience is something to admire.",
            "You have a beautiful way of seeing the world.",
            "You're the type who leaves things better than you found them.",
            "Your voice is calming even when you're just talking.",
            "You have an inner light that doesn't go out.",
            "You're more capable than you currently believe.",
            "Your loyalty is one of your strongest qualities.",
            "You make people want to be better.",
            "Your laughter is medicine.",
            "You have a rare mix of kindness and strength.",
            "You're the kind of person stories are written about.",
            "Your mind is sharp and your heart is soft.",
            "You bring peace wherever you go.",
            "You're someone worth celebrating.",
            "Your existence makes the group better.",
            "You have a talent for turning strangers into friends.",
            "Your patience is impressive.",
            "You're a walking reminder that good people still exist.",
            "Your way of thinking is refreshing.",
            "You make even ordinary days meaningful.",
            "You're the type who remembers the little things.",
            "Your courage shows even in small actions.",
            "You have a presence that feels like home.",
            "You're easier to talk to than most people.",
            "Your sincerity is beautiful.",
            "You make people feel less alone.",
            "Your growth is visible and inspiring.",
            "You're someone who deserves all the good things.",
            "Your spirit is unbreakable.",
            "You have a way of making hard times softer.",
            "You're the definition of main character energy.",
            "Your empathy is one of your greatest strengths.",
            "You make the people around you better.",
            "Your potential is still only partially unlocked.",
            "You're a rare type of genuine.",
            "Your smile has healed more than you know.",
            "You have the kind of energy that stays with people.",
            "You're exactly the person someone needed today.",
            "Your heart is in the right place — always."
        ];

        const compliment = compliments[Math.floor(Math.random() * compliments.length)];

        await empire.sendMessage(m.chat, {
            text: `Hey @${userToCompliment.split('@')[0]}, ${compliment} ✨`,
            mentions: [userToCompliment],
            contextInfo: newsletterContext({ mentionedJid: [userToCompliment] })
        }, { quoted: m });

    } catch (e) {
        console.error('Compliment Error:', e);
        reply('❌ Failed to send the compliment.');
    }
    break;
}

case 'quiz':
case 'qz': {
    try {
        const id = gameUserId(m);
        let state = miniGameState.get(id);

        // If user is answering a previous quiz
        if (state && state.type === 'quiz') {
            const userAns = (q || text || '').trim().toUpperCase().replace(/[^A-D1-4]/g, '');
            if (!userAns) {
                return reply(`❌ Please answer with *A, B, C, D* or *1, 2, 3, 4*\n\nQuestion still active:\n${state.question}`);
            }

            const map = { '1': 'A', '2': 'B', '3': 'C', '4': 'D' };
            const finalAns = map[userAns] || userAns;

            miniGameState.delete(id);

            if (finalAns === state.answer) {
                return reply(`✅ *CORRECT!* 🎉\n\n${state.question}\n\nAnswer: *${state.answer}) ${state.correctText}*\n\nType ${prefix}quiz for another one!`);
            } else {
                return reply(`❌ *WRONG!*\n\n${state.question}\n\nYour answer: *${finalAns}*\nCorrect answer: *${state.answer}) ${state.correctText}*\n\nType ${prefix}quiz to try a new question!`);
            }
        }

        // Start a new quiz
        const questions = [
            { q: "🇳🇬 What is the capital of Nigeria?", opts: ["Kano", "Abuja", "Lagos", "Ibadan"], ans: "B", correct: "Abuja" },
            { q: "🇳🇬 Which river is the longest in Nigeria?", opts: ["River Benue", "River Niger", "Cross River", "Ogun River"], ans: "B", correct: "River Niger" },
            { q: "🇳🇬 In which year did Nigeria gain independence?", opts: ["1957", "1960", "1963", "1970"], ans: "B", correct: "1960" },
            { q: "🇳🇬 What is the official currency of Nigeria?", opts: ["Cedi", "Naira", "Rand", "Shilling"], ans: "B", correct: "Naira" },
            { q: "🇳🇬 Which Nigerian city is known as the 'Centre of Excellence'?", opts: ["Abuja", "Kano", "Lagos", "Port Harcourt"], ans: "C", correct: "Lagos" },
            { q: "🌍 What is the largest continent by land area?", opts: ["Africa", "Asia", "Europe", "North America"], ans: "B", correct: "Asia" },
            { q: "🌍 Which is the largest country in Africa by land area?", opts: ["Nigeria", "Egypt", "Algeria", "South Africa"], ans: "C", correct: "Algeria" },
            { q: "🌍 Which African country was never colonized?", opts: ["Ghana", "Ethiopia", "Kenya", "Senegal"], ans: "B", correct: "Ethiopia" },
            { q: "🌍 What is the longest river in the world?", opts: ["Amazon", "Nile", "Yangtze", "Mississippi"], ans: "B", correct: "Nile" },
            { q: "🌍 Mount Kilimanjaro is located in which country?", opts: ["Kenya", "Tanzania", "Uganda", "Ethiopia"], ans: "B", correct: "Tanzania" },
            { q: "🌍 How many continents are there?", opts: ["5", "6", "7", "8"], ans: "C", correct: "7" },
            { q: "🌍 What is the smallest continent?", opts: ["Europe", "Australia", "Antarctica", "South America"], ans: "B", correct: "Australia" },
            { q: "🌍 Which ocean is the largest?", opts: ["Atlantic", "Indian", "Arctic", "Pacific"], ans: "D", correct: "Pacific" },
            { q: "🌍 What is the capital of France?", opts: ["Lyon", "Marseille", "Paris", "Nice"], ans: "C", correct: "Paris" },
            { q: "🌍 What is the capital of Japan?", opts: ["Osaka", "Tokyo", "Kyoto", "Nagoya"], ans: "B", correct: "Tokyo" },
            { q: "🌍 Which planet is known as the Red Planet?", opts: ["Venus", "Mars", "Jupiter", "Saturn"], ans: "B", correct: "Mars" },
            { q: "🌍 How many planets are in our solar system?", opts: ["7", "8", "9", "10"], ans: "B", correct: "8" },
            { q: "🌍 What is the largest planet in our solar system?", opts: ["Earth", "Saturn", "Jupiter", "Neptune"], ans: "C", correct: "Jupiter" },
            { q: "🌍 Who painted the Mona Lisa?", opts: ["Van Gogh", "Picasso", "Leonardo da Vinci", "Michelangelo"], ans: "C", correct: "Leonardo da Vinci" },
            { q: "🌍 How many sides does a hexagon have?", opts: ["5", "6", "7", "8"], ans: "B", correct: "6" },
            { q: "🔬 What gas do plants absorb from the atmosphere?", opts: ["Oxygen", "Nitrogen", "Carbon Dioxide", "Hydrogen"], ans: "C", correct: "Carbon Dioxide" },
            { q: "🔬 What is H2O commonly known as?", opts: ["Salt", "Water", "Oxygen", "Hydrogen Peroxide"], ans: "B", correct: "Water" },
            { q: "🔬 What is the chemical symbol for gold?", opts: ["Ag", "Au", "Fe", "Pb"], ans: "B", correct: "Au" },
            { q: "🔬 How many bones are in the adult human body?", opts: ["186", "206", "226", "256"], ans: "B", correct: "206" },
            { q: "🔬 What is the hardest natural substance on Earth?", opts: ["Gold", "Iron", "Diamond", "Platinum"], ans: "C", correct: "Diamond" },
            { q: "🔬 What planet is closest to the Sun?", opts: ["Venus", "Mercury", "Earth", "Mars"], ans: "B", correct: "Mercury" },
            { q: "🔬 What is the speed of light (approx)?", opts: ["300,000 km/s", "150,000 km/s", "30,000 km/s", "3,000 km/s"], ans: "A", correct: "300,000 km/s" },
            { q: "🔬 Which blood type is known as the universal donor?", opts: ["A", "B", "AB", "O"], ans: "D", correct: "O" },
            { q: "🔬 What is the main gas found in the air we breathe?", opts: ["Oxygen", "Carbon Dioxide", "Nitrogen", "Hydrogen"], ans: "C", correct: "Nitrogen" },
            { q: "🔬 What does DNA stand for?", opts: ["Deoxyribonucleic Acid", "Dynamic Nuclear Acid", "Deoxy Nitrogen Acid", "Dual Nucleic Acid"], ans: "A", correct: "Deoxyribonucleic Acid" },
            { q: "💻 JavaScript primarily runs in which environment?", opts: ["Printer", "Browser", "Camera", "Microwave"], ans: "B", correct: "Browser" },
            { q: "💻 What does CPU stand for?", opts: ["Central Process Unit", "Central Processing Unit", "Computer Personal Unit", "Central Processor Utility"], ans: "B", correct: "Central Processing Unit" },
            { q: "💻 What does HTML stand for?", opts: ["Hyper Text Markup Language", "Hyperlink and Text Markup Language", "Home Tool Markup Language", "Hyperlink Text Management Language"], ans: "A", correct: "Hyper Text Markup Language" },
            { q: "💻 Who is known as the father of computers?", opts: ["Bill Gates", "Charles Babbage", "Steve Jobs", "Alan Turing"], ans: "B", correct: "Charles Babbage" },
            { q: "💻 What does WWW stand for?", opts: ["World Wide Web", "World Web Wide", "Wide World Web", "Web World Wide"], ans: "A", correct: "World Wide Web" },
            { q: "💻 Which company developed the Android operating system?", opts: ["Apple", "Microsoft", "Google", "Samsung"], ans: "C", correct: "Google" },
            { q: "💻 What does USB stand for?", opts: ["Universal Serial Bus", "United Serial Bus", "Universal System Bus", "Ultra Serial Bus"], ans: "A", correct: "Universal Serial Bus" },
            { q: "💻 What is the brain of the computer?", opts: ["RAM", "Hard Drive", "CPU", "Motherboard"], ans: "C", correct: "CPU" },
            { q: "💻 Which language is primarily used for web styling?", opts: ["HTML", "Python", "CSS", "Java"], ans: "C", correct: "CSS" },
            { q: "💻 What does AI stand for?", opts: ["Automated Intelligence", "Artificial Intelligence", "Advanced Internet", "Applied Information"], ans: "B", correct: "Artificial Intelligence" },
            { q: "⚽ How many players are on a standard football (soccer) team on the field?", opts: ["9", "10", "11", "12"], ans: "C", correct: "11" },
            { q: "⚽ Which country has won the most FIFA World Cups?", opts: ["Germany", "Italy", "Brazil", "Argentina"], ans: "C", correct: "Brazil" },
            { q: "⚽ In which sport is the term 'love' used?", opts: ["Football", "Tennis", "Basketball", "Cricket"], ans: "B", correct: "Tennis" },
            { q: "⚽ How long is a standard football (soccer) match?", opts: ["80 minutes", "90 minutes", "100 minutes", "120 minutes"], ans: "B", correct: "90 minutes" },
            { q: "⚽ Which country hosted the 2022 FIFA World Cup?", opts: ["Russia", "Qatar", "USA", "Brazil"], ans: "B", correct: "Qatar" },
            { q: "🏀 How many points is a free throw worth in basketball?", opts: ["1", "2", "3", "4"], ans: "A", correct: "1" },
            { q: "🏀 How many players are on a basketball team on the court?", opts: ["4", "5", "6", "7"], ans: "B", correct: "5" },
            { q: "🏈 In American football, how many points is a touchdown worth?", opts: ["3", "6", "7", "8"], ans: "B", correct: "6" },
            { q: "🎾 How many Grand Slam tournaments are there in tennis?", opts: ["3", "4", "5", "6"], ans: "B", correct: "4" },
            { q: "🏏 How many players are in a cricket team?", opts: ["9", "10", "11", "12"], ans: "C", correct: "11" },
            { q: "🎬 Who directed the movie Titanic?", opts: ["Steven Spielberg", "James Cameron", "Christopher Nolan", "Martin Scorsese"], ans: "B", correct: "James Cameron" },
            { q: "🎬 Which movie features the quote 'May the Force be with you'?", opts: ["Star Trek", "Star Wars", "The Matrix", "Avatar"], ans: "B", correct: "Star Wars" },
            { q: "🎵 Which artist is known as the 'King of Pop'?", opts: ["Elvis Presley", "Michael Jackson", "Prince", "Justin Timberlake"], ans: "B", correct: "Michael Jackson" },
            { q: "🎵 How many strings does a standard guitar have?", opts: ["4", "5", "6", "7"], ans: "C", correct: "6" },
            { q: "📚 Who wrote 'Romeo and Juliet'?", opts: ["Charles Dickens", "William Shakespeare", "Jane Austen", "Mark Twain"], ans: "B", correct: "William Shakespeare" },
            { q: "📚 What is the first book of the Bible?", opts: ["Exodus", "Genesis", "Matthew", "Psalms"], ans: "B", correct: "Genesis" },
            { q: "🎮 What does NPC stand for in gaming?", opts: ["New Player Character", "Non-Player Character", "Next Playable Character", "Normal Player Control"], ans: "B", correct: "Non-Player Character" },
            { q: "🎮 Which company makes the PlayStation console?", opts: ["Microsoft", "Nintendo", "Sony", "Sega"], ans: "C", correct: "Sony" },
            { q: "📱 Which company created the iPhone?", opts: ["Samsung", "Google", "Apple", "Huawei"], ans: "C", correct: "Apple" },
            { q: "🔢 What is 15 × 15?", opts: ["200", "225", "250", "275"], ans: "B", correct: "225" },
            { q: "🔢 How many degrees are in a circle?", opts: ["180", "270", "360", "400"], ans: "C", correct: "360" },
            { q: "🔢 What is the square root of 144?", opts: ["10", "11", "12", "14"], ans: "C", correct: "12" },
            { q: "🔢 What is 2⁹ (2 to the power of 9)?", opts: ["256", "512", "1024", "128"], ans: "B", correct: "512" },
            { q: "🔢 How many hours are in a week?", opts: ["148", "168", "186", "196"], ans: "B", correct: "168" },
            { q: "🌡️ At what Celsius temperature does water freeze?", opts: ["0°C", "32°C", "100°C", "-10°C"], ans: "A", correct: "0°C" },
            { q: "🌡️ At what Celsius temperature does water boil?", opts: ["90°C", "100°C", "110°C", "120°C"], ans: "B", correct: "100°C" },
            { q: "🕰️ How many minutes are in a full day?", opts: ["1240", "1440", "1640", "1840"], ans: "B", correct: "1440" },
            { q: "🕰️ How many seconds are in one hour?", opts: ["3600", "3000", "6000", "2400"], ans: "A", correct: "3600" },
            { q: "🧬 What is the powerhouse of the cell?", opts: ["Nucleus", "Ribosome", "Mitochondria", "Chloroplast"], ans: "C", correct: "Mitochondria" },
            { q: "🇳🇬 Which Nigerian artist is known as the 'African Giant'?", opts: ["Wizkid", "Burna Boy", "Davido", "Olamide"], ans: "B", correct: "Burna Boy" },
            { q: "🇳🇬 What does Nollywood refer to?", opts: ["Nigerian music", "Nigerian fashion", "Nigerian film industry", "Nigerian sports"], ans: "C", correct: "Nigerian film industry" },
            { q: "🌍 Which country is home to the Eiffel Tower?", opts: ["Italy", "Spain", "France", "Germany"], ans: "C", correct: "France" },
            { q: "🌍 What is the currency of the United Kingdom?", opts: ["Euro", "Dollar", "Pound Sterling", "Yen"], ans: "C", correct: "Pound Sterling" },
            { q: "🌍 Which animal is known as the 'King of the Jungle'?", opts: ["Tiger", "Elephant", "Lion", "Gorilla"], ans: "C", correct: "Lion" },
            { q: "🌍 How many hearts does an octopus have?", opts: ["1", "2", "3", "4"], ans: "C", correct: "3" },
            { q: "🌍 What is the tallest animal in the world?", opts: ["Elephant", "Giraffe", "Ostrich", "Camel"], ans: "B", correct: "Giraffe" },
            { q: "🌍 Which bird is often associated with delivering babies?", opts: ["Eagle", "Stork", "Owl", "Penguin"], ans: "B", correct: "Stork" },
            { q: "🌍 What do you call a baby kangaroo?", opts: ["Cub", "Joey", "Pup", "Calf"], ans: "B", correct: "Joey" },
            { q: "🌍 Which planet has the most moons?", opts: ["Jupiter", "Saturn", "Uranus", "Neptune"], ans: "B", correct: "Saturn" },
            { q: "💡 What does 'LOL' stand for?", opts: ["Lots of Love", "Laugh Out Loud", "League of Legends", "Look Out Later"], ans: "B", correct: "Laugh Out Loud" },
            { q: "💡 What does 'BRB' mean?", opts: ["Be Right Back", "Big Red Button", "Bring Real Bread", "Best Reply Buddy"], ans: "A", correct: "Be Right Back" },
            { q: "💡 What does 'OMG' stand for?", opts: ["Oh My God", "Oh My Goodness", "Only My Game", "Both A and B"], ans: "D", correct: "Both A and B" },
            { q: "💡 Which social media platform is known for short videos?", opts: ["Facebook", "LinkedIn", "TikTok", "Reddit"], ans: "C", correct: "TikTok" },
            { q: "💡 What year was WhatsApp founded?", opts: ["2007", "2009", "2011", "2013"], ans: "B", correct: "2009" },
            { q: "💡 Who co-founded Microsoft?", opts: ["Steve Jobs", "Bill Gates", "Mark Zuckerberg", "Elon Musk"], ans: "B", correct: "Bill Gates" },
            { q: "💡 What does PDF stand for?", opts: ["Personal Document Format", "Portable Document Format", "Public Data File", "Printable Document File"], ans: "B", correct: "Portable Document Format" },
            { q: "💡 What is the name of Elon Musk's space company?", opts: ["Blue Origin", "SpaceX", "Virgin Galactic", "NASA"], ans: "B", correct: "SpaceX" },
            { q: "💡 Which company owns Instagram?", opts: ["Google", "Twitter", "Meta (Facebook)", "Microsoft"], ans: "C", correct: "Meta (Facebook)" },
            { q: "💡 What does VPN stand for?", opts: ["Virtual Private Network", "Very Personal Network", "Verified Public Network", "Visual Private Node"], ans: "A", correct: "Virtual Private Network" }
        ];

        const item = questions[Math.floor(Math.random() * questions.length)];
        const questionText = `${item.q}\n\nA) ${item.opts[0]}\nB) ${item.opts[1]}\nC) ${item.opts[2]}\nD) ${item.opts[3]}`;

        miniGameState.set(id, {
            type: 'quiz',
            answer: item.ans,
            correctText: item.correct,
            question: questionText
        });

        await reply(`❓ *QUIZ TIME*\n\n${questionText}\n\n📝 Reply with *${prefix}quiz A* (or B/C/D or 1/2/3/4)\n⏰ Answer before starting a new quiz!`);

    } catch (err) {
        console.error('Quiz error:', err);
        reply(`❌ *Failed to load quiz:* ${err.message || 'Unknown error'}`);
    }
    break;
}

case 'truth': {
    try {
        const truths = [
            "What is one goal you are currently chasing?",
            "What is the funniest thing that has happened to you in a group chat?",
            "If you could learn any skill instantly, what would it be?",
            "What is your biggest fear (keep it light)?",
            "Who in this group do you think is the most real?",
            "What is one thing you pretend to understand but don’t?",
            "What is your most used emoji and why?",
            "Have you ever sent a message to the wrong person? What happened?",
            "What is the weirdest dream you still remember?",
            "If you could switch lives with someone in this group for a day, who would it be?",
            "What is one habit you want to stop?",
            "What is one habit you want to start?",
            "What song do you secretly love but won’t admit?",
            "What is the last thing that made you laugh really hard?",
            "Who was your first celebrity crush?",
            "What is your go-to excuse when you don’t want to do something?",
            "What is one thing people always misunderstand about you?",
            "If you had a superpower for 24 hours, what would you choose?",
            "What is the most childish thing you still do?",
            "What is your unpopular opinion?",
            "What is one compliment you wish people gave you more?",
            "What is the biggest risk you’ve ever taken?",
            "What is your comfort food?",
            "What is one thing you are secretly good at?",
            "What is one thing you are secretly bad at?",
            "If your life was a movie, what genre would it be?",
            "What is the best piece of advice you’ve ever received?",
            "What is the worst piece of advice you’ve ever received?",
            "Who in this group would survive a zombie apocalypse?",
            "What is your favorite way to waste time?",
            "What is one thing you always overthink?",
            "What is your biggest flex right now?",
            "What is one thing that instantly makes your day better?",
            "What is one thing that instantly ruins your mood?",
            "If you could time travel, would you go to the past or future?",
            "What is the most random fact you know?",
            "What is your favorite childhood memory?",
            "What is one thing you miss from your childhood?",
            "Who do you text first when something good happens?",
            "Who do you text first when something bad happens?",
            "What is your toxic trait (be honest)?",
            "What is your green flag in a person?",
            "What is your red flag in a person?",
            "What is the last lie you told (small one)?",
            "What is one thing you would change about yourself if you could?",
            "What is one thing you would never change about yourself?",
            "What is your favorite time of the day and why?",
            "What is the most embarrassing song on your playlist?",
            "What is one goal you achieved that you’re proud of?",
            "What is one goal you failed at and what did you learn?",
            "If you could only eat one meal for the rest of your life, what would it be?",
            "What is your favorite social media app and why?",
            "What is one trend you never understood?",
            "What is one trend you secretly follow?",
            "Who in this group has the best sense of humor?",
            "Who in this group is the most dramatic?",
            "Who in this group is the most calm?",
            "What is your love language?",
            "Have you ever had a crush on someone in this group? (yes/no only)",
            "What is the longest you’ve gone without your phone?",
            "What is one thing that always makes you nostalgic?",
            "What is your favorite season and why?",
            "What is one place you want to visit before you die?",
            "What is one place you never want to visit again?",
            "What is the weirdest food combination you actually like?",
            "What is one movie or series you can watch forever?",
            "What is one movie or series you pretend to like?",
            "What is your biggest ick?",
            "What is the nicest thing someone has done for you recently?",
            "What is the nicest thing you’ve done for someone recently?",
            "If you won ₦10 million tomorrow, what is the first thing you’d buy?",
            "What is one thing money can’t buy that you really want?",
            "What is your favorite way to relax after a long day?",
            "What is one thing you’re looking forward to this month?",
            "What is one thing you’re dreading this month?",
            "What is your spirit animal and why?",
            "What is one nickname you’ve been called that you actually like?",
            "What is one nickname you hate?",
            "If you could master any language instantly, which one would it be?",
            "What is one subject you were surprisingly good at in school?",
            "What is one subject you struggled with the most?",
            "What is the best gift you’ve ever received?",
            "What is the best gift you’ve ever given?",
            "What is one thing you collect or used to collect?",
            "What is your favorite type of weather?",
            "What is one conspiracy theory you find entertaining?",
            "What is one thing that always makes you smile?",
            "What is one thing that always makes you angry?",
            "If this group had a motto, what should it be?",
            "What is one thing you want people to remember you for?",
            "What is your current status in life in one sentence?",
            "What is one small win you had this week?",
            "What is one lesson 2025/2026 taught you so far?",
            "If you could send a message to your past self, what would you say?",
            "What is one question you are too afraid to ask someone?",
            "What is the most spontaneous thing you’ve ever done?",
            "What is one thing you do when nobody is watching?",
            "What is your favorite quote or saying?",
            "What is one thing that gives you hope?",
            "What is one thing that keeps you up at night?",
            "If you had to describe yourself in three words, what would they be?",
            "What is one secret talent you have?",
            "What is the last thing you searched on Google?",
            "What is one thing you want to achieve before the year ends?",
            "Who in this group would you trust with your phone for 24 hours?",
            "What is one thing you’re grateful for right now?"
        ];

        const truth = truths[Math.floor(Math.random() * truths.length)];

        await reply(`🎭 *TRUTH*\n\n${truth}`);

    } catch (err) {
        console.error('Truth error:', err);
        reply(`❌ *Failed to load truth:* ${err.message || 'Unknown error'}`);
    }
    break;
}

// ═══════════════════════════════════════════════════
// GCDESCRIPTION - Set group description
// ═══════════════════════════════════════════════════
case 'gcdescription':
case 'setdesc':
case 'setdescription': {
    if (!isGroup) return reply("👥 Group only!");
    if (!isCreator && !isAdmins) return reply("❌ Admins only!");
    if (!text) return reply(`Usage: ${prefix}gcdescription <new description>`);
    try {
        await empire.groupUpdateDescription(m.chat, text);
        reply(`✅ *Group description updated!*`);
    } catch (e) {
        reply(`❌ Failed to update description: ${e.message}`);
    }
    break;
}

case 'gcstatuslink':
case 'gcsl':
case 'gcslink':
case 'statuslink':
case 'gslink': {
    // Only work from DM
    if (m.isGroup) return reply('❌ This command only works in private chat (DM).');

    const link = (text || '').trim();
    if (!link) {
        return reply(
            `📱 *GCSTATUSLINK*\n\n` +
            `Reply to any text/media with:\n` +
            `${prefix}gcstatuslink <whatsapp-group-invite-link>\n\n` +
            `Example:\n` +
            `${prefix}gcstatuslink https://chat.whatsapp.com/KAjUdEoPJMe85CArrtpsuG`
        );
    }

    // Extract invite code
    const inviteMatch = link.match(/chat\.whatsapp\.com\/([A-Za-z0-9_-]+)/);
    if (!inviteMatch) {
        return reply('❌ Invalid WhatsApp group invite link.');
    }
    const inviteCode = inviteMatch[1];

    try {
        const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

        // ─── Get group info & join if needed ────────────────
        let groupInfo;
        try {
            groupInfo = await empire.groupGetInviteInfo(inviteCode);
        } catch (e) {
            return reply('❌ Could not get group info. Link may be invalid or expired.');
        }

        const groupJid = groupInfo.id;

        // Check if bot is already in the group
        const metadata = await empire.groupMetadata(groupJid).catch(() => null);
        if (!metadata) {
            // Not in group → join
            await empire.groupAcceptInvite(inviteCode);
            await new Promise(r => setTimeout(r, 1500)); // small delay after joining
        }

        // ─── Helper: post status to the target group ────────
        async function postStatusToGroup(content) {
            return empire.sendMessage(groupJid, {
                ...content,
                contextInfo: {
                    ...(content.contextInfo || {}),
                    isGroupStatus: true,
                    statusSourceType: content.text ? 'TEXT' :
                                      content.image ? 'IMAGE' :
                                      content.video ? 'VIDEO' :
                                      content.audio ? 'AUDIO' : 'TEXT',
                    statusAttributions: [{ type: 10 }],
                    statusAudienceMetadata: {
                        audienceType: 'CLOSE_FRIENDS'
                    }
                }
            });
        }

        const quoted = m.quoted ? m.quoted : null;

        // ─── TEXT STATUS ────────────────────────────────────
        if (!quoted) {
            // User just sent the link + optional text after it
            const extraText = text.replace(link, '').trim();
            const statusText = extraText || '‎'; // empty text not allowed

            await postStatusToGroup({
                text: statusText,
                backgroundColor: '#9C27B0'
            });

            return empire.sendMessage(m.chat, {
                react: { text: '✅', key: m.key }
            });
        }

        // ─── MEDIA STATUS ───────────────────────────────────
        const mediaType = quoted.mimetype?.includes('image') ? 'image' :
                          quoted.mimetype?.includes('video') ? 'video' :
                          quoted.mimetype?.includes('audio') ? 'audio' : null;

        if (!mediaType) {
            return reply('❌ Reply to an image, video, audio or voice note.');
        }

        const buffer = await quoted.download();
        if (!buffer?.length) throw new Error('Downloaded media is empty');

        // Audio → voice note (ptt)
        if (mediaType === 'audio') {
            await postStatusToGroup({
                audio: buffer,
                mimetype: 'audio/ogg; codecs=opus',
                ptt: true
            });
            return empire.sendMessage(m.chat, {
                react: { text: '🎵', key: m.key }
            });
        }

        // Image / Video
        let finalBuffer = buffer;

        // Optional effects for images
        if (mediaType === 'image') {
            try {
                const sharp = require('sharp');
                let img = sharp(buffer);
                if (args.includes('--blur')) img = img.blur(5);
                if (args.includes('--grayscale')) img = img.grayscale();
                if (args.includes('--sepia')) img = img.tint({ r: 112, g: 66, b: 20 });
                finalBuffer = await img.toBuffer();
            } catch {}
        }

        const caption = (quoted.text || quoted.caption || '').trim();

        await postStatusToGroup({
            [mediaType]: finalBuffer,
            caption: caption || ''
        });

        await empire.sendMessage(m.chat, {
            react: { text: '✅', key: m.key }
        });

    } catch (e) {
        console.error('[GCSTATUSLINK]', e);
        reply(`❌ Failed to post group status:\n${e.message || e}`);
    }
    break;
}

// ═══════════════════════════════════════════════════
// RESETLINK - Reset group invite link
// ═══════════════════════════════════════════════════
case 'resetlink':
case 'revokelink':
case 'resetgrouplink': {
    if (!isGroup) return reply("👥 Group only!");
    if (!isCreator && !isAdmins) return reply("❌ Admins only!");
    try {
        await empire.groupRevokeInvite(m.chat);
        // Get new link
        const code = await empire.groupInviteCode(m.chat);
        reply(`✅ *Group invite link has been reset!*\n\n🔗 *New Link:*\nhttps://chat.whatsapp.com/${code}`);
    } catch (e) {
        reply(`❌ Failed to reset link: ${e.message}`);
    }
    break;
}
// ═══════════════════════════════════════════════════
// IMAGINE / FLUX IMAGE GENERATION COMMAND
// ═══════════════════════════════════════════════════
case 'imagine':
case 'generate':
case 'flux':
case 'fluximg':
case 'aiimage': {
    if (!text) return reply(`🖼️ Usage: ${prefix}imagine <prompt>\nExample: ${prefix}imagine A handsome gentleman`);
    await reply(`🎨 *Generating image for:* ${text}`);
    try {
        // ─── CALL PRINCE TECHNO FLUX API ───
        const apiUrl = `https://api.princetechn.com/api/ai/fluximg?apikey=prince&prompt=${encodeURIComponent(text)}`;
        const response = await axios.get(apiUrl, { 
            timeout: 60000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        
        if (response.data?.success && response.data?.result) {
            const imageUrl = response.data.result;
            
            // ─── SEND GENERATED IMAGE ───
            await empire.sendMessage(m.chat, {
                image: { url: imageUrl },
                caption: `🖼️ *Generated Image*\n📝 Prompt: ${text}\n📡 API: Prince Techno Flux\n⏱️ Generated: ${new Date().toLocaleString()}`,
                contextInfo: newsletterContext()
            }, { quoted: m });
            
        } else {
            throw new Error('Invalid response from Flux API');
        }
        
    } catch (e) {
        console.error('Flux image error:', e);
        
        // ─── FALLBACK 1: Pollinations.ai ───
        try {
            await reply('🔄 *Flux unavailable, trying Pollinations.ai...*');
            const fallbackUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(text)}?width=1024&height=1024&nologo=true`;
            
            await empire.sendMessage(m.chat, {
                image: { url: fallbackUrl },
                caption: `🖼️ *Generated Image (Pollinations.ai)*\n📝 Prompt: ${text}\n⏱️ Generated: ${new Date().toLocaleString()}`,
                contextInfo: newsletterContext()
            }, { quoted: m });
            
        } catch (fallbackErr) {
            // ─── FALLBACK 2: Lexica.art ───
            try {
                await reply('🔄 *Trying Lexica.art...*');
                const lexicaUrl = `https://lexica.art/api/v1/search?q=${encodeURIComponent(text)}`;
                const lexicaRes = await axios.get(lexicaUrl, { timeout: 15000 });
                
                if (lexicaRes.data?.images?.length > 0) {
                    const imageUrl = lexicaRes.data.images[0].src;
                    await empire.sendMessage(m.chat, {
                        image: { url: imageUrl },
                        caption: `🖼️ *Generated Image (Lexica)*\n📝 Prompt: ${text}\n⏱️ Generated: ${new Date().toLocaleString()}`,
                        contextInfo: newsletterContext()
                    }, { quoted: m });
                } else {
                    throw new Error('No images found on Lexica');
                }
            } catch (finalErr) {
                reply(`❌ *Failed to generate image:* ${e.message || 'Unknown error'}`);
            }
        }
    }
    break;
}

// ─── QUICK IMAGE GENERATION SHORTCUT ───
case 'draw': {
    // Image-generation shortcut (use .imagine or .draw; .img is reserved for sticker conversion)
    const cmd = 'imagine';
    const args = [text];
    // Recursively call imagine
    const tempText = text;
    // Execute imagine logic
    if (!tempText) return reply(`🖼️ Usage: ${prefix}img <prompt>\nExample: ${prefix}img A cat riding a unicorn`);
    
    await reply(`🎨 *Generating image for:* ${tempText}`);
    try {
        const apiUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(tempText)}`;
        const response = await axios.get(apiUrl, { timeout: 60000 });
        
        if (response.data?.success && response.data?.result) {
            await empire.sendMessage(m.chat, {
                image: { url: response.data.result },
                caption: `🖼️ *Generated Image*\n📝 Prompt: ${tempText}\n📡 API: Prince Techno Flux`,
                contextInfo: newsletterContext()
            }, { quoted: m });
        } else {
            // Fallback to Pollinations
            const fallbackUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(tempText)}?width=1024&height=1024&nologo=true`;
            await empire.sendMessage(m.chat, {
                image: { url: fallbackUrl },
                caption: `🖼️ *Generated Image (Pollinations)*\n📝 Prompt: ${tempText}`,
                contextInfo: newsletterContext()
            }, { quoted: m });
        }
    } catch (e) {
        reply(`❌ *Failed to generate image:* ${e.message || 'Unknown error'}`);
    }
    break;
}

// ═══════════════════════════════════════════════════
// AI COMMAND — OMEGATECH KIMI (FREE / NO API KEY)
// ═══════════════════════════════════════════════════
case 'ai':
case 'ask':
case 'chat':
case 'gemini': {
    if (!text) return reply(`🤖 Usage: ${prefix}ai <question>\nExample: ${prefix}ai Explain quantum computing simply`);
    await reply('🤖 *VICO AI is thinking...*');
    try {
        const apiUrl = `https://api.omegatech.app/api/ai/kimi?q=${encodeURIComponent(text)}`;
        const response = await axios.get(apiUrl, {
            timeout: 60000,
            headers: {
                'User-Agent': 'VICO-XMD/3.0',
                'Accept': 'application/json'
            }
        });

        const data = response.data || {};
        let answer =
            (typeof data === 'string' ? data : null) ||
            data.result ||
            data.response ||
            data.answer ||
            data.text ||
            data.message ||
            data.data?.result ||
            data.data?.response ||
            data.data?.answer ||
            data.data?.text;

        if (!answer) throw new Error('OmegaTech AI returned an empty response.');
        answer = String(answer).replace(/```/g, '').trim();
        if (answer.length > 4000) answer = answer.slice(0, 3950) + '...';

        await empire.sendMessage(m.chat, {
            text: `🤖 *VICO AI · OmegaTech*\n\n${answer}`,
            contextInfo: newsletterContext()
        }, { quoted: m });
    } catch (e) {
        console.error('OmegaTech AI error:', e.response?.data || e.message);
        reply(`❌ *OmegaTech AI failed:* ${e.response?.data?.message || e.message || 'Try again later.'}`);
    }
    break;
}

// ═══════════════════════════════════════════════════
// SETMENUIMAGE - Set menu image
// ═══════════════════════════════════════════════════
case 'setbotppp':
case 'setbotpics':
case 'setmenuimage': {
    if (!isCreator) return reply("❌ Owner only!");
    
    const quoted = m.quoted ? m.quoted : m;
    const mime = quoted.mimetype || '';
    
    if (!/image/.test(mime)) {
        return reply(`🖼️ *Usage:* Reply to an image with:\n${prefix}setmenuimage\n\nThe image will be saved as the menu banner.`);
    }
    
    try {
        await reply('⏳ *Downloading and saving menu image...*');
        
        // Download the image
        const mediaBuffer = await empire.downloadMediaMessage(quoted);
        if (!mediaBuffer || mediaBuffer.length === 0) {
            return reply('❌ Failed to download image.');
        }
        
        // Create media directory if it doesn't exist
        const mediaDir = path.join(process.cwd(), 'media');
        if (!fs.existsSync(mediaDir)) {
            fs.mkdirSync(mediaDir, { recursive: true });
        }
        
        // Save the image
        const imagePath = path.join(mediaDir, 'logo.jpg');
        fs.writeFileSync(imagePath, mediaBuffer);
        
        // Update global menu image
        global.menuImage = imagePath;
        menuImageBuffer = mediaBuffer;
        
        reply(`✅ *Menu image updated successfully!*\n\n📁 *Saved to:* ${imagePath}\n🔄 Run ${prefix}menu to see the new image.`);
        
    } catch (e) {
        console.error('Set menu image error:', e);
        reply(`❌ Failed to set menu image: ${e.message || 'Unknown error'}`);
    }
    break;
}

// ═══════════════════════════════════════════════════
// SETBOTNAME - Set bot name
// ═══════════════════════════════════════════════════
case 'newsletter':
case 'setchannelname':
case 'setnewsletter': {
    if (!isCreator) return reply("❌ Owner only!");
    
    if (!text) {
        return reply(
`🤖 *SET BOT NAME*
Current name: ${global.botName || '𝐕𝐈𝐂𝐎 𝐗𝐌𝐃 𓉳'}

Usage: ${prefix}setbotname <new name>

Example: ${prefix}setbotname My Awesome Bot

📌 *This affects:*
• Menu header
• Newsletter name
• Sticker pack name
• Welcome messages`
        );
    }
    
    try {
        // Update global bot name
        global.botName = text.trim();
        global.packname = text.trim();
        global.newsletterName = text.trim();
        
        reply(`✅ *Bot name updated!*\n\n🤖 *New Name:* ${global.botName}\n\n📌 *Changes applied to:*\n• Menu header\n• Newsletter name\n• Sticker pack name\n• Welcome messages`);
        
    } catch (e) {
        reply(`❌ Failed to set bot name: ${e.message || 'Unknown error'}`);
    }
    break;
}
        // ═══════════════════════════════════════════════════
// AUTOREACT - Auto react to messages (Owner only)
// ═══════════════════════════════════════════════════
case 'autoreact':
case 'ar': {
    if (!isCreator) return reply("❌ Owner only!");
    const opt = args[0]?.toLowerCase();
    
    if (opt === 'on') { 
        autoMessageReact = true; 
        reply(`✅ *AUTO-REACT ON*\n\nBot will automatically react to messages with random reactions.`);
    } 
    else if (opt === 'off') { 
        autoMessageReact = false; 
        reply(`❌ *AUTO-REACT OFF*`);
    } 
    else if (opt === 'status') {
        reply(`💫 *AUTO-REACT STATUS*\nStatus: ${autoMessageReact ? '🟢 ON' : '🔴 OFF'}\n\n${prefix}autoreact on/off`);
    }
    else {
        reply(`💫 *AUTO-REACT*\nStatus: ${autoMessageReact ? '🟢 ON' : '🔴 OFF'}\n\n${prefix}autoreact on\n${prefix}autoreact off\n${prefix}autoreact status`);
    }
    break;
}
        // ═══════════════════════════════════════════════════
        // 3. STICKER - Image/Video to sticker
        // ═══════════════════════════════════════════════════
        case 'sticker':
case 'stiker':
case 's': {
    try {
        const quoted = m.quoted ? m.quoted : m;
        const mime = quoted.mimetype || '';
        
        if (!/image|video/.test(mime)) {
            return reply(`🖼️ Send/reply to an image or video with:\n${prefix}sticker`);
        }
        
        await reply('⏳ Creating sticker...');
        
        const mediaBuffer = await empire.downloadMediaMessage(quoted);
        if (!mediaBuffer || mediaBuffer.length === 0) {
            return reply('❌ Failed to download media.');
        }
        
        // Use wa-sticker-formatter (doesn't require FFmpeg for images)
        const { Sticker } = require('wa-sticker-formatter');
        
        const isAnimated = /video/.test(mime) || mime.includes('gif');
        
        const sticker = new Sticker(mediaBuffer, {
            pack: global.packname || '𝐕𝐈𝐂𝐎 𝐗𝐌𝐃 𓉳',
            author: global.OWNER_NAME || '𝐌𝐑 𝐑𝐌𝐒 𓉳',
            type: isAnimated ? 'animated' : 'full',
            quality: 80,
            crop: false,
        });
        
        const stickerBuffer = await sticker.toBuffer();
        
        if (!stickerBuffer || stickerBuffer.length === 0) {
            return reply('❌ Failed to create sticker.');
        }
        
        await empire.sendMessage(m.chat, { 
            sticker: stickerBuffer,
            contextInfo: newsletterContext()
        }, { quoted: m });
        
    } catch (e) {
        console.error('Sticker error:', e);
        reply(`❌ Sticker failed: ${e.message || 'Unknown error'}`);
    }
    break;
}

        // ═══════════════════════════════════════════════════
// PLAYVIDEO / YOUTUBE - Download YouTube video
case 'yt':
case 'youtube':
case 'ytvideo':
case 'ytmp4': {
    if (!text) return reply(`🎬 Usage: ${prefix}playvideo <YouTube URL>
Example: ${prefix}playvideo https://youtu.be/xxxxxxxxxxx`);
    if (!/(youtube\.com|youtu\.be)/i.test(text)) return reply('❌ Send a valid YouTube URL.');
    await reply('🎬 *Fetching YouTube video...*');
    try {
        const video = await APIs.getEliteProTechVideoByUrl(text).catch(() => APIs.getYupraVideoByUrl(text)).catch(() => APIs.getOkatsuVideoByUrl(text));
        if (!video?.download) throw new Error('No video source returned');
        const response = await axios.get(video.download, { responseType: 'arraybuffer', timeout: 120000, maxContentLength: Infinity, maxBodyLength: Infinity, headers: {'User-Agent':'Mozilla/5.0','Accept':'*/*'} });
        const buffer = Buffer.from(response.data);
        if (buffer.length < 1000) throw new Error('Downloaded video is empty or corrupted');
        const title = String(video.title || 'VICO XMD Video').replace(/[\\/:*?"<>|]/g, '').slice(0, 80);
        await empire.sendMessage(m.chat, { video: buffer, mimetype: 'video/mp4', fileName: `${title}.mp4`, caption: `🎬 *${title}*\n⚡ VICO XMD`, contextInfo: newsletterContext() }, { quoted: m });
    } catch (e) {
        console.error('playvideo error:', e.message);
        return reply(`❌ YouTube video download failed: ${e.message || 'Try another URL.'}`);
    }
    break;
}

// PLAY - Download song from YouTube (FIXED with api.js)
// ═══════════════════════════════════════════════════
case 'play':
case 'song':
case 'ytmp3': {
    if (!text) return reply(`🎵 Usage: ${prefix}play <song name or YouTube URL>\nExample: ${prefix}play Khai With You`);
    await reply('🎵 *Downloading audio...*');

    try {
        let videoUrl = text.trim();
        let videoTitle = 'VICO XMD Audio';

        // Search YouTube when a title/search phrase is supplied.
        if (!/(youtube\.com|youtu\.be)/i.test(videoUrl)) {
            const search = await yts(videoUrl);
            if (!search?.videos?.length) return reply('❌ No YouTube result found for that song.');
            const first = search.videos[0];
            videoUrl = first.url;
            videoTitle = first.title || videoTitle;
        } else {
            try {
                const info = await yts({ videoId: (videoUrl.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/) || [])[1] });
                if (info?.title) videoTitle = info.title;
            } catch (_) {}
        }

        // Use the bot's existing YouTube-audio API fallbacks.
        const methods = [
            () => APIs.getEliteProTechAudioByUrl ? APIs.getEliteProTechAudioByUrl(videoUrl) : null,
            () => APIs.getYupraAudioByUrl ? APIs.getYupraAudioByUrl(videoUrl) : null,
            () => APIs.getOkatsuAudioByUrl ? APIs.getOkatsuAudioByUrl(videoUrl) : null
        ];

        let result = null;
        for (const method of methods) {
            try {
                const candidate = await method();
                if (candidate?.download || candidate?.url) {
                    result = candidate;
                    break;
                }
            } catch (_) {}
        }

        // Compatibility fallback for API versions that expose the direct endpoint only.
        if (!result) {
            const fallbackApis = [
                `https://api.princetechn.com/api/download/ytmp3?apikey=prince&url=${encodeURIComponent(videoUrl)}`,
                `https://eliteprotech-apis.zone.id/ytdown?url=${encodeURIComponent(videoUrl)}&format=mp3`,
                `https://api.yupra.my.id/api/downloader/ytmp3?url=${encodeURIComponent(videoUrl)}`
            ];
            for (const url of fallbackApis) {
                try {
                    const r = await axios.get(url, { timeout: 45000, headers: { 'User-Agent': 'Mozilla/5.0' } });
                    const d = r.data?.data || r.data?.result || r.data;
                    const download = r.data?.download_url || r.data?.download || r.data?.downloadURL || d?.download_url || d?.download || d?.url || r.data?.dl;
                    if (download) {
                        result = { download, title: r.data?.title || d?.title || videoTitle };
                        break;
                    }
                } catch (_) {}
            }
        }

        if (!result?.download && !result?.url) {
            throw new Error('No audio download source is available right now.');
        }

        const downloadUrl = result.download || result.url;
        const response = await axios.get(downloadUrl, {
            responseType: 'arraybuffer', timeout: 120000,
            maxContentLength: Infinity, maxBodyLength: Infinity,
            headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': '*/*' }
        });
        let audioBuffer = Buffer.from(response.data);
        if (audioBuffer.length < 1000) throw new Error('Downloaded audio is empty or corrupted.');

        // Convert non-MP3 responses to a normal MP3 when FFmpeg is available.
        const isMP3 = audioBuffer.toString('ascii', 0, 3) === 'ID3' ||
            (audioBuffer[0] === 0xFF && (audioBuffer[1] & 0xE0) === 0xE0);
        if (!isMP3) {
            try {
                const format = audioBuffer.toString('ascii', 0, 4) === 'OggS' ? 'ogg' :
                    audioBuffer.toString('ascii', 0, 4) === 'RIFF' ? 'wav' : 'm4a';
                audioBuffer = await toAudio(audioBuffer, format);
            } catch (_) {}
        }

        const title = String(result.title || videoTitle || 'VICO XMD Audio')
            .replace(/[\\/:*?"<>|]/g, '').slice(0, 100) || 'VICO XMD Audio';

        // PLAY = AUDIO ONLY. No thumbnail, no extra caption, no video.
        await empire.sendMessage(m.chat, {
            audio: audioBuffer,
            mimetype: 'audio/mpeg',
            fileName: `${title}.mp3`,
            ptt: false,
            contextInfo: newsletterContext()
        }, { quoted: m });
    } catch (err) {
        console.error('Play audio error:', err);
        reply(`❌ *Play failed:* ${err.message || 'Unable to download audio.'}`);
    }
    break;
}

      // ═══════════════════════════════════════════════════
// DEEPSEEK AI COMMAND - Prince Techno API
// ═══════════════════════════════════════════════════
case 'deepseek':
case 'ds':
case 'deep': {
    if (!text) return reply(`🧠 Usage: ${prefix}deepseek <question>\nExample: ${prefix}deepseek What is love?`);
    await reply('🧠 *Thinking with DeepSeek...*');
    try {
        // ─── TRY 1: AGENTROUTER (DeepSeek model) ───
        let answer = await askAgentRouter(text, AGENTROUTER_DEEPSEEK_MODEL);
        if (answer) {
            if (answer.length > 4000) {
                answer = answer.slice(0, 3950) + '...\n\n📌 *Truncated due to length*';
            }
            await empire.sendMessage(m.chat, {
                text: `🧠 *DeepSeek AI · AgentRouter*\n\n${answer}\n\n━━━━━━━━━━━━━━━━\n💡 *Ask anything else:* ${prefix}deepseek <question>`,
                contextInfo: newsletterContext()
            }, { quoted: m });
            break;
        }

        // ─── TRY 2: PRINCE TECHNO DEEPSEEK API (Fallback) ───
        const apiUrl = `https://api.princetechn.com/api/ai/deepseek-v3?apikey=prince&q=${encodeURIComponent(text)}`;
        const response = await axios.get(apiUrl, { 
            timeout: 30000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        
        if (response.data?.success && response.data?.result) {
            let answer = response.data.result;
            
            // ─── CLEAN RESPONSE ───
            answer = answer.replace(/```/g, '').trim();
            
            // ─── TRUNCATE IF TOO LONG ───
            if (answer.length > 4000) {
                answer = answer.slice(0, 3950) + '...\n\n📌 *Truncated due to length*';
            }
            
            // ─── SEND RESPONSE ───
            await empire.sendMessage(m.chat, {
                text: `🧠 *DeepSeek AI*\n\n${answer}\n\n━━━━━━━━━━━━━━━━\n💡 *Ask anything else:* ${prefix}deepseek <question>`,
                contextInfo: newsletterContext()
            }, { quoted: m });
            
        } else {
            throw new Error('Invalid response from DeepSeek API');
        }
        
    } catch (e) {
        console.error('DeepSeek error:', e);
        
        // ─── FALLBACK: Use Gemini API ───
        try {
            await reply('🔄 *DeepSeek unavailable, trying Gemini...*');
            const geminiUrl = `https://api.princetechn.com/api/ai/geminiai?apikey=prince&q=${encodeURIComponent(text)}`;
            const geminiResponse = await axios.get(geminiUrl, { timeout: 30000 });
            
            if (geminiResponse.data?.success && geminiResponse.data?.result) {
                let answer = geminiResponse.data.result;
                if (answer.length > 4000) {
                    answer = answer.slice(0, 3950) + '...\n\n📌 *Truncated*';
                }
                await empire.sendMessage(m.chat, {
                    text: `🤖 *Gemini AI (Fallback)*\n\n${answer}\n\n━━━━━━━━━━━━━━━━\n💡 *Ask anything else:* ${prefix}deepseek <question>`,
                    contextInfo: newsletterContext()
                }, { quoted: m });
            } else {
                throw new Error('Gemini fallback failed');
            }
        } catch (fallbackErr) {
            reply(`❌ *Failed to get response:* ${e.message || 'Unknown error'}`);
        }
    }
    break;
}
// ═══════════════════════════════════════════════════
// FACEBOOK DOWNLOAD
// ═══════════════════════════════════════════════════
case 'fb':
case 'facebook':
case 'fbdl': {
    if (!text) return reply(`📱 Usage: ${prefix}fb <facebook_url>\nExample: ${prefix}fb https://www.facebook.com/watch?v=123456789`);
    
    // Validate Facebook URL
    if (!text.includes('facebook.com') && !text.includes('fb.watch')) {
        return reply('❌ Please provide a valid Facebook video URL.');
    }
    
    await reply('📥 *Processing Facebook video...* Please wait.');
    
    try {
        const APIs = require('./api.js');
        
        // Try multiple APIs
        let videoUrl = null;
        let audioUrl = null;
        let title = 'Facebook Video';
        let usedApi = '';
        
        // ─── TRY SIPUTZX API ───
        try {
            const response = await axios.get(
                `https://api.siputzx.my.id/api/d/fbdl?url=${encodeURIComponent(text)}`,
                { timeout: 30000 }
            );
            if (response.data?.status && response.data?.data) {
                const data = response.data.data;
                videoUrl = data.video || data.hd || data.sd || data.url;
                audioUrl = data.audio || data.music_url;
                title = data.title || data.caption || 'Facebook Video';
                usedApi = 'Siputzx API';
                console.log('✅ Facebook: Siputzx API succeeded');
            }
        } catch (e) {
            console.log('❌ Facebook: Siputzx API failed:', e.message);
        }
        
        // ─── TRY SHIZO API ───
        if (!videoUrl) {
            try {
                const response = await axios.get(
                    `https://api.shizo.top/downloader/fb?apikey=shizo&url=${encodeURIComponent(text)}`,
                    { timeout: 30000 }
                );
                if (response.data?.status && response.data?.result) {
                    const result = response.data.result;
                    videoUrl = result.download || result.video || result.url;
                    title = result.title || 'Facebook Video';
                    usedApi = 'Shizo API';
                    console.log('✅ Facebook: Shizo API succeeded');
                }
            } catch (e) {
                console.log('❌ Facebook: Shizo API failed:', e.message);
            }
        }
        
        // ─── TRY MALVRYX API ───
        if (!videoUrl) {
            try {
                const response = await axios.get(
                    `https://apis.malvryx.dev/api/downloader/fbdl?url=${encodeURIComponent(text)}`,
                    { 
                        timeout: 30000,
                        headers: { 'X-API-Key': 'mlvx_free_15c210e6c0fed4d5d90d556c0bebd068480f03740106d0d3c8189362089ac986' }
                    }
                );
                if (response.data?.status && response.data?.result) {
                    const result = response.data.result;
                    videoUrl = result.video || result.sd || result.hd || result.url;
                    audioUrl = result.audio || result.music_url;
                    title = result.title || result.caption || 'Facebook Video';
                    usedApi = 'Malvryx API';
                    console.log('✅ Facebook: Malvryx API succeeded');
                }
            } catch (e) {
                console.log('❌ Facebook: Malvryx API failed:', e.message);
            }
        }
        
        if (!videoUrl) {
            return reply('❌ Failed to download Facebook video. The video may be private or unavailable.');
        }
        
        // ─── SEND VIDEO ───
        await empire.sendMessage(m.chat, {
            video: { url: videoUrl },
            caption: `📹 *${title}*\n\n🔗 *Source:* ${text}\n📡 *API:* ${usedApi}`,
            contextInfo: newsletterContext()
        }, { quoted: m });
        
        // ─── SEND AUDIO IF AVAILABLE ───
        if (audioUrl) {
            await delay(1000);
            await empire.sendMessage(m.chat, {
                audio: { url: audioUrl },
                mimetype: 'audio/mpeg',
                fileName: `${title}.mp3`,
                contextInfo: newsletterContext()
            }, { quoted: m });
        }
        
    } catch (e) {
        console.error('Facebook download error:', e);
        reply(`❌ *Failed to download:* ${e.message || 'Unknown error'}`);
    }
    break;
}

case 'repo':
case 'repository':
case 'script': {
    const txt = `📂 *Bot Repository*

🌐✨ ━━━━━━━ 【🚀 THE AWAITED WHATSAPP BOT HAS FINALLY ARRIVED! 🚀】 ━━━━━━━ ✨🌐

BOT NAME : 𝐕𝐈𝐂𝐎 𝐗𝐌𝐃 𓉳

After months of fine-tuning, precision coding, and endless upgrades...
💫 The moment you’ve all been waiting for is HERE! 💫

Introducing the revolutionary WhatsApp automation system that lets you
⚡ DEPLOY, MANAGE & CONTROL YOUR WHATSAPP LIKE A KING! 👑

🎯 Deploy it now and step into the future of smart control:
🔗 👉 https://t.me/RMS_HK

💥 No limits. No lags. Just pure dominance.
Unleash total automation — send commands, control chats, and rule your space effortlessly.
Every message, every response, every command... now bows to your touch 👑🔥

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚡ Powered by:
💎 𝐌𝐑 𝐑𝐌𝐒 𓉳 💎
🕶️ *Elite Innovation* 🕶️
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👑 𝐌𝐑 𝐑𝐌𝐒 𓉳 👑`;

    await empire.sendMessage(m.chat, {
        text: txt,
        contextInfo: newsletterContext()
    }, { quoted: m });
    break;
}    

case 'whoami': {
    try {
        const target = m.sender;
        const userName = m.pushName || userName || 'User';

        const ppUrl = await empire.profilePictureUrl(target, 'image').catch(() => null);

        if (ppUrl) {
            await empire.sendMessage(m.chat, {
                image: { url: ppUrl },
                caption: `👤 *You are:* ${userName}`,
                mentions: [target]
            }, { quoted: m });
        } else {
            await empire.sendMessage(m.chat, {
                text: `👤 *You are:* ${userName}`,
                mentions: [target]
            }, { quoted: m });
        }

    } catch (e) {
        const userName = m.pushName || 'User';
        await empire.sendMessage(m.chat, {
            text: `👤 *You are:* ${userName}`
        }, { quoted: m });
    }
    break;
}

// ═══════════════════════════════════════════════════
// INSTAGRAM DOWNLOAD
// ═══════════════════════════════════════════════════
case 'ig':
case 'instagram':
case 'igdl': {
    if (!text) return reply(`📱 Usage: ${prefix}ig <instagram_url>\nExample: ${prefix}ig https://www.instagram.com/p/CxYz123ABC/`);
    
    // Validate Instagram URL
    if (!text.includes('instagram.com') && !text.includes('instagr.am')) {
        return reply('❌ Please provide a valid Instagram post/reel URL.');
    }
    
    await reply('📥 *Processing Instagram media...* Please wait.');
    
    try {
        let videoUrl = null;
        let imageUrls = [];
        let title = 'Instagram Media';
        let usedApi = '';
        
        // ─── TRY SIPUTZX API ───
        try {
            const response = await axios.get(
                `https://api.siputzx.my.id/api/d/igdl?url=${encodeURIComponent(text)}`,
                { timeout: 30000 }
            );
            if (response.data?.status && response.data?.data) {
                const data = response.data.data;
                if (data.urls && Array.isArray(data.urls)) {
                    // Check if it's video or image
                    const firstUrl = data.urls[0];
                    if (firstUrl && (firstUrl.includes('.mp4') || firstUrl.includes('video'))) {
                        videoUrl = firstUrl;
                    } else {
                        imageUrls = data.urls;
                    }
                } else if (data.video) {
                    videoUrl = data.video;
                } else if (data.url) {
                    if (data.url.includes('.mp4')) {
                        videoUrl = data.url;
                    } else {
                        imageUrls = [data.url];
                    }
                }
                title = data.title || data.caption || 'Instagram Media';
                usedApi = 'Siputzx API';
                console.log('✅ Instagram: Siputzx API succeeded');
            }
        } catch (e) {
            console.log('❌ Instagram: Siputzx API failed:', e.message);
        }
        
        // ─── TRY SHIZO API ───
        if (!videoUrl && imageUrls.length === 0) {
            try {
                const response = await axios.get(
                    `https://api.shizo.top/downloader/ig?apikey=shizo&url=${encodeURIComponent(text)}`,
                    { timeout: 30000 }
                );
                if (response.data?.status && response.data?.result) {
                    const result = response.data.result;
                    if (result.video) {
                        videoUrl = result.video;
                    } else if (result.images && Array.isArray(result.images)) {
                        imageUrls = result.images;
                    }
                    title = result.title || 'Instagram Media';
                    usedApi = 'Shizo API';
                    console.log('✅ Instagram: Shizo API succeeded');
                }
            } catch (e) {
                console.log('❌ Instagram: Shizo API failed:', e.message);
            }
        }
        
        // ─── TRY MALVRYX API ───
        if (!videoUrl && imageUrls.length === 0) {
            try {
                const response = await axios.get(
                    `https://apis.malvryx.dev/api/downloader/igdl?url=${encodeURIComponent(text)}`,
                    { 
                        timeout: 30000,
                        headers: { 'X-API-Key': 'mlvx_free_15c210e6c0fed4d5d90d556c0bebd068480f03740106d0d3c8189362089ac986' }
                    }
                );
                if (response.data?.status && response.data?.result) {
                    const result = response.data.result;
                    if (result.video) {
                        videoUrl = result.video;
                    } else if (result.images && Array.isArray(result.images)) {
                        imageUrls = result.images;
                    }
                    title = result.title || 'Instagram Media';
                    usedApi = 'Malvryx API';
                    console.log('✅ Instagram: Malvryx API succeeded');
                }
            } catch (e) {
                console.log('❌ Instagram: Malvryx API failed:', e.message);
            }
        }
        
        if (!videoUrl && imageUrls.length === 0) {
            return reply('❌ Failed to download Instagram media. The post may be private or unavailable.');
        }
        
        // ─── SEND VIDEO ───
        if (videoUrl) {
            await empire.sendMessage(m.chat, {
                video: { url: videoUrl },
                caption: `📹 *${title}*\n\n🔗 *Source:* ${text}\n📡 *API:* ${usedApi}`,
                contextInfo: newsletterContext()
            }, { quoted: m });
        }
        
        // ─── SEND IMAGES ───
        if (imageUrls.length > 0) {
            const totalImages = Math.min(imageUrls.length, 15);
            for (let i = 0; i < totalImages; i++) {
                const imgUrl = imageUrls[i];
                if (imgUrl) {
                    const caption = i === 0 ? 
                        `🖼️ *${title}*\n📸 ${i+1}/${totalImages}\n🔗 *Source:* ${text}\n📡 *API:* ${usedApi}` :
                        `📸 ${i+1}/${totalImages}`;
                    await empire.sendMessage(m.chat, {
                        image: { url: imgUrl },
                        caption: caption,
                        contextInfo: newsletterContext()
                    }, { quoted: m });
                    await delay(500);
                }
            }
        }
        
    } catch (e) {
        console.error('Instagram download error:', e);
        reply(`❌ *Failed to download:* ${e.message || 'Unknown error'}`);
    }
    break;
}

// ═══════════════════════════════════════════════════
// TWITTER / X DOWNLOAD
// ═══════════════════════════════════════════════════
case 'tw':
case 'twitter':
case 'x':
case 'xdl':
case 'twitterdl': {
    if (!text) return reply(`📱 Usage: ${prefix}tw <twitter_url>\nExample: ${prefix}tw https://twitter.com/user/status/123456789`);
    
    // Validate Twitter URL
    if (!text.includes('twitter.com') && !text.includes('x.com')) {
        return reply('❌ Please provide a valid Twitter/X post URL.');
    }
    
    await reply('📥 *Processing Twitter/X media...* Please wait.');
    
    try {
        let videoUrl = null;
        let imageUrls = [];
        let title = 'Twitter Media';
        let usedApi = '';
        
        // ─── TRY SIPUTZX API ───
        try {
            const response = await axios.get(
                `https://api.siputzx.my.id/api/d/twitter?url=${encodeURIComponent(text)}`,
                { timeout: 30000 }
            );
            if (response.data?.status && response.data?.data) {
                const data = response.data.data;
                if (data.video) {
                    videoUrl = data.video;
                } else if (data.images && Array.isArray(data.images)) {
                    imageUrls = data.images;
                } else if (data.url) {
                    if (data.url.includes('.mp4') || data.url.includes('video')) {
                        videoUrl = data.url;
                    } else {
                        imageUrls = [data.url];
                    }
                }
                title = data.title || data.caption || 'Twitter Media';
                usedApi = 'Siputzx API';
                console.log('✅ Twitter: Siputzx API succeeded');
            }
        } catch (e) {
            console.log('❌ Twitter: Siputzx API failed:', e.message);
        }
        
        // ─── TRY SHIZO API ───
        if (!videoUrl && imageUrls.length === 0) {
            try {
                const response = await axios.get(
                    `https://api.shizo.top/downloader/twitter?apikey=shizo&url=${encodeURIComponent(text)}`,
                    { timeout: 30000 }
                );
                if (response.data?.status && response.data?.result) {
                    const result = response.data.result;
                    if (result.video) {
                        videoUrl = result.video;
                    } else if (result.images && Array.isArray(result.images)) {
                        imageUrls = result.images;
                    }
                    title = result.title || 'Twitter Media';
                    usedApi = 'Shizo API';
                    console.log('✅ Twitter: Shizo API succeeded');
                }
            } catch (e) {
                console.log('❌ Twitter: Shizo API failed:', e.message);
            }
        }
        
        // ─── TRY MALVRYX API ───
        if (!videoUrl && imageUrls.length === 0) {
            try {
                const response = await axios.get(
                    `https://apis.malvryx.dev/api/downloader/twitterdl?url=${encodeURIComponent(text)}`,
                    { 
                        timeout: 30000,
                        headers: { 'X-API-Key': 'mlvx_free_15c210e6c0fed4d5d90d556c0bebd068480f03740106d0d3c8189362089ac986' }
                    }
                );
                if (response.data?.status && response.data?.result) {
                    const result = response.data.result;
                    if (result.video) {
                        videoUrl = result.video;
                    } else if (result.images && Array.isArray(result.images)) {
                        imageUrls = result.images;
                    }
                    title = result.title || 'Twitter Media';
                    usedApi = 'Malvryx API';
                    console.log('✅ Twitter: Malvryx API succeeded');
                }
            } catch (e) {
                console.log('❌ Twitter: Malvryx API failed:', e.message);
            }
        }
        
        if (!videoUrl && imageUrls.length === 0) {
            return reply('❌ Failed to download Twitter/X media. The post may be private or unavailable.');
        }
        
        // ─── SEND VIDEO ───
        if (videoUrl) {
            await empire.sendMessage(m.chat, {
                video: { url: videoUrl },
                caption: `📹 *${title}*\n\n🔗 *Source:* ${text}\n📡 *API:* ${usedApi}`,
                contextInfo: newsletterContext()
            }, { quoted: m });
        }
        
        // ─── SEND IMAGES ───
        if (imageUrls.length > 0) {
            const totalImages = Math.min(imageUrls.length, 15);
            for (let i = 0; i < totalImages; i++) {
                const imgUrl = imageUrls[i];
                if (imgUrl) {
                    const caption = i === 0 ? 
                        `🖼️ *${title}*\n📸 ${i+1}/${totalImages}\n🔗 *Source:* ${text}\n📡 *API:* ${usedApi}` :
                        `📸 ${i+1}/${totalImages}`;
                    await empire.sendMessage(m.chat, {
                        image: { url: imgUrl },
                        caption: caption,
                        contextInfo: newsletterContext()
                    }, { quoted: m });
                    await delay(500);
                }
            }
        }
        
    } catch (e) {
        console.error('Twitter download error:', e);
        reply(`❌ *Failed to download:* ${e.message || 'Unknown error'}`);
    }
    break;
}
// ═══════════════════════════════════════════════════
// SNAPCHAT DOWNLOAD
// ═══════════════════════════════════════════════════
case 'snap':
case 'snapchat':
case 'sc':
case 'snapdl': {
    if (!text) return reply(`📱 Usage: ${prefix}snap <snapchat_url>\nExample: ${prefix}snap https://www.snapchat.com/link/123456789`);
    
    // Validate Snapchat URL
    if (!text.includes('snapchat.com')) {
        return reply('❌ Please provide a valid Snapchat URL.');
    }
    
    await reply('📥 *Processing Snapchat media...* Please wait.');
    
    try {
        let videoUrl = null;
        let imageUrl = null;
        let title = 'Snapchat Media';
        let usedApi = '';
        
        // ─── TRY SHIZO API ───
        try {
            const response = await axios.get(
                `https://api.shizo.top/downloader/snapchat?apikey=shizo&url=${encodeURIComponent(text)}`,
                { timeout: 30000 }
            );
            if (response.data?.status && response.data?.result) {
                const result = response.data.result;
                if (result.video) {
                    videoUrl = result.video;
                } else if (result.image) {
                    imageUrl = result.image;
                } else if (result.url) {
                    if (result.url.includes('.mp4')) {
                        videoUrl = result.url;
                    } else {
                        imageUrl = result.url;
                    }
                }
                title = result.title || 'Snapchat Media';
                usedApi = 'Shizo API';
                console.log('✅ Snapchat: Shizo API succeeded');
            }
        } catch (e) {
            console.log('❌ Snapchat: Shizo API failed:', e.message);
        }
        
        // ─── TRY MALVRYX API ───
        if (!videoUrl && !imageUrl) {
            try {
                const response = await axios.get(
                    `https://apis.malvryx.dev/api/downloader/snapdl?url=${encodeURIComponent(text)}`,
                    { 
                        timeout: 30000,
                        headers: { 'X-API-Key': 'mlvx_free_15c210e6c0fed4d5d90d556c0bebd068480f03740106d0d3c8189362089ac986' }
                    }
                );
                if (response.data?.status && response.data?.result) {
                    const result = response.data.result;
                    if (result.video) {
                        videoUrl = result.video;
                    } else if (result.image) {
                        imageUrl = result.image;
                    }
                    title = result.title || 'Snapchat Media';
                    usedApi = 'Malvryx API';
                    console.log('✅ Snapchat: Malvryx API succeeded');
                }
            } catch (e) {
                console.log('❌ Snapchat: Malvryx API failed:', e.message);
            }
        }
        
        // ─── TRY SIPUTZX API ───
        if (!videoUrl && !imageUrl) {
            try {
                const response = await axios.get(
                    `https://api.siputzx.my.id/api/d/snapdl?url=${encodeURIComponent(text)}`,
                    { timeout: 30000 }
                );
                if (response.data?.status && response.data?.data) {
                    const data = response.data.data;
                    if (data.video) {
                        videoUrl = data.video;
                    } else if (data.image) {
                        imageUrl = data.image;
                    }
                    title = data.title || 'Snapchat Media';
                    usedApi = 'Siputzx API';
                    console.log('✅ Snapchat: Siputzx API succeeded');
                }
            } catch (e) {
                console.log('❌ Snapchat: Siputzx API failed:', e.message);
            }
        }
        
        if (!videoUrl && !imageUrl) {
            return reply('❌ Failed to download Snapchat media. The content may be private or expired.');
        }
        
        // ─── SEND VIDEO ───
        if (videoUrl) {
            await empire.sendMessage(m.chat, {
                video: { url: videoUrl },
                caption: `📹 *${title}*\n\n🔗 *Source:* ${text}\n📡 *API:* ${usedApi}`,
                contextInfo: newsletterContext()
            }, { quoted: m });
        }
        
        // ─── SEND IMAGE ───
        if (imageUrl) {
            await empire.sendMessage(m.chat, {
                image: { url: imageUrl },
                caption: `🖼️ *${title}*\n\n🔗 *Source:* ${text}\n📡 *API:* ${usedApi}`,
                contextInfo: newsletterContext()
            }, { quoted: m });
        }
        
    } catch (e) {
        console.error('Snapchat download error:', e);
        reply(`❌ *Failed to download:* ${e.message || 'Unknown error'}`);
    }
    break;
}

case 'say':
case 'tts': {
    if (!text) return reply(`🔊 Usage: ${prefix}say <text> [language]\nExample: ${prefix}say Hello world`);

    let ttsText = text;
    let lang = 'en';

    // FULL LANGUAGE MAP - not abbreviation
    const langMap = {
        'english': 'en', 'spanish': 'es', 'french': 'fr', 'german': 'de',
        'italian': 'it', 'portuguese': 'pt', 'yoruba': 'yo', 'hausa': 'ha',
        'igbo': 'ig', 'arabic': 'ar', 'chinese': 'zh', 'japanese': 'ja',
        'korean': 'ko', 'russian': 'ru', 'hindi': 'hi'
    };
    const fullName = {
        'en': 'English', 'es': 'Spanish', 'fr': 'French', 'de': 'German',
        'it': 'Italian', 'pt': 'Portuguese', 'yo': 'Yoruba', 'ha': 'Hausa',
        'ig': 'Igbo', 'ar': 'Arabic', 'zh': 'Chinese', 'ja': 'Japanese',
        'ko': 'Korean', 'ru': 'Russian', 'hi': 'Hindi'
    };
    const codes = Object.keys(langMap).concat(Object.values(langMap));

    const words = text.trim().split(' ');
    const lastWord = words[words.length - 1].toLowerCase();
    
    if (codes.includes(lastWord) && words.length > 1) {
        if (langMap[lastWord]) lang = langMap[lastWord];
        else lang = lastWord;
        ttsText = words.slice(0, -1).join(' ');
    }

    if (ttsText.length > 200) ttsText = ttsText.slice(0, 200);

    await reply(`🔊 Generating speech in *${fullName[lang] || lang}*...`);

    try {
        const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(ttsText)}&tl=${lang}&client=tw-ob`;
        const response = await axios.get(url, { 
            responseType: 'arraybuffer', 
            timeout: 15000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'https://translate.google.com/'
            }
        });
        
        if (!response.data || response.data.length < 100) throw new Error('Empty audio');

        // FIX: Send as normal audio first, not ptt - mp3 go play
        await empire.sendMessage(m.chat, {
            audio: Buffer.from(response.data),
            mimetype: 'audio/mpeg',
            ptt: false, // FALSE make am playable as audio, TRUE dey cause can't play
            contextInfo: newsletterContext()
        }, { quoted: m });

    } catch (e) {
        console.error('TTS error:', e.message);
        reply(`❌ TTS failed in ${fullName[lang] || lang}. Try shorter text.\nExample: ${prefix}tts Hello world`);
    }
    break;
}

        // ═══════════════════════════════════════════════════
        // 7. TRANSLATE
        // ═══════════════════════════════════════════════════
        case 'translate':
        case 'tr': {
            if (args.length < 2) return reply(`🌐 Usage: ${prefix}translate <lang> <text>\nExample: ${prefix}translate es Hello`);
            const lang = args[0];
            const textToTr = args.slice(1).join(' ');
            try {
                const res = await axios.get(`https://translate.googleapis.com/translate_a/single`, {
                    params: { client: 'gtx', sl: 'auto', tl: lang, dt: 't', q: textToTr },
                    timeout: 8000
                });
                const translated = res.data[0].map(s => s[0]).join('');
                reply(`🌐 *Translated (${lang}):*\n\n${translated}`);
            } catch (e) {
                reply(`❌ Translation failed. Check language code.`);
            }
            break;
        }

        // ═══════════════════════════════════════════════════
        // 15. TAGALL
        // ═══════════════════════════════════════════════════
        case 'tagall':
        case 'everyone': {
            if (!isGroup) return reply("👥 Group only!");
            if (!isCreator && !isAdmins) return reply("❌ Admins only!");
            const msg = text || "📢 Attention everyone!";
            const mentions = participants.map(p => p.id);
            const tags = mentions.map(p => `• @${p.split('@')[0]}`).join('\n');
            await empire.sendMessage(m.chat, {
                text: `${msg}\n\n👥 *Members (${participants.length})*\n${tags}`,
                mentions,
                contextInfo: newsletterContext({ mentionedJid: mentions })
            }, { quoted: m });
            break;
        }

        // ═══════════════════════════════════════════════════
        // 16. GROUPINFO
        // ═══════════════════════════════════════════════════
        case 'groupinfo':
        case 'gcinfo': {
            if (!isGroup) return reply("👥 Group only!");
            const adminList = groupAdmins.map(a => `  👑 @${a.split('@')[0]}`).join('\n');
            await empire.sendMessage(m.chat, {
                text:
`ℹ️ *GROUP INFO*
📛 Name: ${groupName}
👥 Members: ${participants.length}
👑 Admins: ${groupAdmins.length}

👑 *Admins:*
${adminList}`,
                mentions: groupAdmins,
                contextInfo: newsletterContext({ mentionedJid: groupAdmins })
            }, { quoted: m });
            break;
        }

        // ═══════════════════════════════════════════════════
        // 17. GROUP MANAGEMENT (promote/demote/kick)
        // ═══════════════════════════════════════════════════
        case 'promote':
        case 'makeadmin': {
            if (!isGroup) return reply("👥 Group only!");
            if (!isCreator && !isAdmins) return reply("❌ Admins only!");
            let target = m.mentionedJid?.[0] || (m.quoted ? m.quoted.sender : null);
            if (!target) return reply(`Usage: ${prefix}promote @user`);
            await empire.groupParticipantsUpdate(m.chat, [target], 'promote');
            await empire.sendMessage(m.chat, { 
                text: `⬆️ @${target.split('@')[0]} promoted to admin!`, 
                mentions: [target],
                contextInfo: newsletterContext({ mentionedJid: [target] })
            }, { quoted: m });
            break;
        }
        case 'demote':
        case 'unadmin': {
            if (!isGroup) return reply("👥 Group only!");
            if (!isCreator && !isAdmins) return reply("❌ Admins only!");
            let target = m.mentionedJid?.[0] || (m.quoted ? m.quoted.sender : null);
            if (!target) return reply(`Usage: ${prefix}demote @user`);
            await empire.groupParticipantsUpdate(m.chat, [target], 'demote');
            await empire.sendMessage(m.chat, { 
                text: `⬇️ @${target.split('@')[0]} demoted!`, 
                mentions: [target],
                contextInfo: newsletterContext({ mentionedJid: [target] })
            }, { quoted: m });
            break;
        }
        case 'kick':
        case 'remove': {
            if (!isGroup) return reply("👥 Group only!");
            if (!isCreator && !isAdmins) return reply("❌ Admins only!");
            let target = m.mentionedJid?.[0] || (m.quoted ? m.quoted.sender : null);
            if (!target) return reply(`Usage: ${prefix}kick @user`);
            if (target === botNumber) return reply("❌ Can't kick the bot!");
            await empire.groupParticipantsUpdate(m.chat, [target], 'remove');
            await empire.sendMessage(m.chat, { 
                text: `👢 @${target.split('@')[0]} kicked!`, 
                mentions: [target],
                contextInfo: newsletterContext({ mentionedJid: [target] })
            }, { quoted: m });
            break;
        }

        case 'kickall': {
            if (!isGroup) return reply("👥 Group only!");
            if (!isCreator && !isAdmins) return reply("❌ Admins only!");
            if (!isBotAdmins) return reply("❌ Bot must be admin to kick members.");

            const confirm = (text || '').toLowerCase().trim();
            if (confirm !== 'confirm') {
                return reply(
                    `⚠️ *KICKALL*\n\n` +
                    `This will remove *all non-admin members* from the group.\n\n` +
                    `Type *${prefix}kickall confirm* to proceed.`
                );
            }

            const toKick = (participants || [])
                .map(p => p.id || p)
                .filter(id => {
                    if (!id) return false;
                    if (id === botNumber) return false;
                    if (groupAdmins.includes(id)) return false;
                    try { if (isGroupAdmin(groupMetadata, [id])) return false; } catch (_) {}
                    return true;
                });

            if (!toKick.length) return reply('✅ No non-admin members to kick.');

            await reply(`👢 Kicking *${toKick.length}* members... (admins stay)`);

            let ok = 0, fail = 0;
            for (const id of toKick) {
                try {
                    await empire.groupParticipantsUpdate(m.chat, [id], 'remove');
                    ok++;
                    await new Promise(r => setTimeout(r, 800));
                } catch (_) { fail++; }
            }

            await reply(`✅ *Kickall done*\nRemoved: *${ok}*\nFailed: *${fail}*\nAdmins were not kicked.`);
            break;
        }

        // ═══════════════════════════════════════════════════
// IDCH - Get channel ID from newsletter link
// ═══════════════════════════════════════════════════
case 'idch':
case 'channelid':
case 'getchannel': {
    if (!isCreator) return reply('❌ *Only the bot owner can use this command.*');
    
    if (!text) {
        return reply(
`📰 *CHANNEL ID EXTRACTOR*

Usage: ${prefix}idch <channel_link>

Example: ${prefix}idch https://whatsapp.com/channel/0029Vb5PzE5XpG7q9Zt3wR1X

📌 *What it does:*
Extracts the WhatsApp channel ID from a channel link
and shows you the newsletter JID format.

💡 *The JID format:*
120363XXXXXXXXXX@newsletter
`);
    }
    
    await reply('🔍 *Extracting channel information...*');
    
    try {
        const link = text.trim();
        
        // ─── VALIDATE LINK ───
        if (!link.includes('whatsapp.com/channel/')) {
            return reply('❌ *Invalid channel link.*\n\nPlease provide a valid WhatsApp channel link like:\nhttps://whatsapp.com/channel/0029Vb5PzE5XpG7q9Zt3wR1X');
        }
        
        // ─── EXTRACT CHANNEL ID ───
        let channelId = null;
        const channelMatch = link.match(/channel\/([A-Za-z0-9_-]+)/i);
        if (channelMatch) {
            channelId = channelMatch[1];
        }
        
        if (!channelId) {
            return reply('❌ *Could not extract channel ID from the link.*');
        }
        
        // ─── GENERATE NEWSLETTER JID ───
        // WhatsApp newsletter JID format: 120363 + channelId numbers @newsletter
        let newsletterJid = null;
        
        // Try to extract numbers from channel ID
        const numbersOnly = channelId.replace(/[^0-9]/g, '');
        if (numbersOnly.length >= 10) {
            // If we have enough numbers, construct JID
            newsletterJid = `120363${numbersOnly.substring(0, 10)}@newsletter`;
        } else {
            // Fallback: use the full channel ID
            newsletterJid = `120363${channelId.replace(/[^0-9]/g, '')}@newsletter`;
        }
        
        // ─── TRY TO VERIFY NEWSLETTER ───
        let channelName = 'Unknown';
        let subscriberCount = 'Unknown';
        let verified = false;
        
        try {
            // Try to get newsletter info
            const info = await empire.newsletterInfo(newsletterJid).catch(() => null);
            if (info) {
                channelName = info.name || info.title || 'Unknown';
                subscriberCount = info.subscribers || 'Unknown';
                verified = true;
                console.log('✅ Newsletter verified:', info.name);
            }
        } catch (e) {
            console.log('Could not verify newsletter:', e.message);
        }
        
        // ─── BUILD RESPONSE ───
        let response = 
`📰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━📰
        ✦  CHANNEL ID  ✦
📰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━📰

📎 *Original Link:*
${link}

📌 *Channel ID:*
${channelId}

📌 *Newsletter JID:*
${newsletterJid}

${verified ? '✅ *Status:* Verified' : '⚠️ *Status:* Could not verify'}`;

        if (verified) {
            response += `
            
📛 *Channel Name:*
${channelName}

👥 *Subscribers:*
${subscriberCount}`;
        }

        response += `

📰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━📰
💡 *How to use this JID:*

1. Copy the Newsletter JID above
2. Use it with the newsletter command:
   ${prefix}newsletter set ${newsletterJid} "${channelName}"

3. Or use it in your bot's config:
   global.newsletterJid = '${newsletterJid}'

📰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━📰`;

        // ─── SEND RESPONSE ───
        await empire.sendMessage(m.chat, {
            text: response,
            contextInfo: newsletterContext()
        }, { quoted: m });
        
    } catch (e) {
        console.error('Channel ID error:', e);
        reply(`❌ *Failed to extract channel ID:* ${e.message || 'Unknown error'}`);
    }
    break;
}

case 'prank':
case 'pr': {
    try {
        const audioUrl = 'https://files.catbox.moe/er5ytm.mp3';
        const response = await axios.get(audioUrl, {
            responseType: 'arraybuffer',
            timeout: 20000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        if (!response.data || response.data.length < 100) {
            return reply('❌ Failed to download prank audio.');
        }

        await empire.sendMessage(m.chat, {
            audio: Buffer.from(response.data),
            mimetype: 'audio/mpeg',
            ptt: false, // false = normal audio (plays properly on WhatsApp)
            contextInfo: newsletterContext()
        }, { quoted: m });

    } catch (e) {
        console.error('Prank audio error:', e.message);
        reply('❌ Failed to send prank audio. Try again later.');
    }
    break;
}


case 'flirt':
case 'rizz': {
    const rizzLines = [
        "Do you watch YouTube? Cuz I want you to be mine 😘",
        "Are you WiFi? Cuz I'm feeling a strong connection 📡",
        "Is your name Google? Because you have everything I've been searching for 🔍",
        "Are you a magician? Every time I look at you, everyone else disappears ✨",
        "If looks could kill, you'd be a weapon of mass destruction 😍",
        "Do you have a map? I just got lost in your eyes 🗺️",
        "Are you French? Because Eiffel for you 🗼",
        "Is your dad a baker? Cuz you're a cutie pie 🥧",
        "Are you a camera? Every time I look at you, I smile 📸",
        "Do you believe in love at first sight — or should I walk by again? 👀",
        "If you were a vegetable, you'd be a cute-cumber 🥒",
        "Are you made of copper and tellurium? Cuz you're Cu-Te 🔬",
        "Is your name Autumn? Cuz I'm falling for you 🍂",
        "Do you have a Band-Aid? I just scraped my knee falling for you 🩹",
        "Are you a parking ticket? Cuz you've got FINE written all over you 🚗",
        "If beauty were time, you'd be eternity ⏳",
        "Are you a loan? Cuz you have my interest 💸",
        "Do you work at Starbucks? Cuz I like you a latte ☕",
        "Are you lightning? Cuz my heart just raced ⚡",
        "Is it hot in here or is it just you? 🔥",
        "Are you a snowstorm? Cuz you make my heart race ❄️",
        "Do you have a sunburn, or are you always this hot? ☀️",
        "Are you a keyboard? Cuz you're my type ⌨️",
        "If you were a fruit, you'd be a fineapple 🍍",
        "Are you Australian? Cuz you meet all my koala-fications 🐨",
        "Do you play soccer? Cuz you're a keeper ⚽",
        "Are you a time traveler? Cuz I see you in my future 🚀",
        "Is your smile insured? Cuz it's precious 💎",
        "Are you gravity? Cuz I keep falling for you 🌍",
        "Do you have a pencil? I want to erase your past and write our future ✏️",
        "Are you Netflix? Cuz I could watch you for hours 📺",
        "If kisses were snowflakes, I'd send you a blizzard 💋",
        "Are you a campfire? Cuz you're hot and I want s'more 🔥",
        "Do you like raisins? How about a date? 🍇",
        "Are you a light switch? Cuz you turn me on 💡",
        "Is your name Chapstick? Cuz you're made for my lips 💄",
        "Are you a bank loan? You have my interest 📈",
        "Do you like Star Wars? Cuz Yoda one for me ⭐",
        "Are you a dictionary? Cuz you add meaning to my life 📖",
        "If you were a song, you'd be on my playlist forever 🎵",
        "Are you caffeine? Cuz you keep me up at night thinking of you ☕",
        "Do you have 11 protons? Cuz you're sodium fine 🔬",
        "Are you a charger? Cuz without you I'd die 🔋",
        "Is heaven missing an angel? Or did they send their best? 😇",
        "Are you a puzzle? Cuz I can't figure out how perfect you are 🧩",
        "Do you believe in fate? Cuz this feels written 📜",
        "Are you the ocean? Cuz I'm lost at sea in your eyes 🌊",
        "If I could rearrange the alphabet, I'd put U and I together 🔤",
        "Are you a star? Cuz your beauty lights up my world 🌟",
        "Do you have a name, or can I call you mine? 💍"
    ];

    const line = rizzLines[Math.floor(Math.random() * rizzLines.length)];

    let target = null;
    if (m.quoted && m.quoted.sender) target = m.quoted.sender;
    else if (m.mentionedJid?.[0]) target = m.mentionedJid[0];

    if (target) {
        const msg = `@${target.split('@')[0]} ${line}`;
        await empire.sendMessage(m.chat, {
            text: msg,
            mentions: [target],
            contextInfo: newsletterContext()
        }, { quoted: m });
    } else {
        await reply(`💘 *${line}*\\n\\n_Reply to someone or tag them with ${prefix}flirt_`);
    }
    break;
}

case 'quote':
case 'quotes':
case 'qotd': {
    const quotes = [
        { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
        { text: "In the middle of every difficulty lies opportunity.", author: "Albert Einstein" },
        { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
        { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
        { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
        { text: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
        { text: "Do what you can, with what you have, where you are.", author: "Theodore Roosevelt" },
        { text: "Everything you’ve ever wanted is on the other side of fear.", author: "George Addair" },
        { text: "Hardships often prepare ordinary people for an extraordinary destiny.", author: "C.S. Lewis" },
        { text: "Don’t watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
        { text: "The best time to plant a tree was 20 years ago. The second best time is now.", author: "Chinese Proverb" },
        { text: "You miss 100% of the shots you don’t take.", author: "Wayne Gretzky" },
        { text: "Whether you think you can or you think you can’t, you’re right.", author: "Henry Ford" },
        { text: "I have not failed. I've just found 10,000 ways that won't work.", author: "Thomas Edison" },
        { text: "The only limit to our realization of tomorrow is our doubts of today.", author: "Franklin D. Roosevelt" },
        { text: "Act as if what you do makes a difference. It does.", author: "William James" },
        { text: "What you get by achieving your goals is not as important as what you become by achieving your goals.", author: "Zig Ziglar" },
        { text: "Keep your face always toward the sunshine—and shadows will fall behind you.", author: "Walt Whitman" },
        { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
        { text: "It always seems impossible until it’s done.", author: "Nelson Mandela" },
        { text: "Don’t let yesterday take up too much of today.", author: "Will Rogers" },
        { text: "You are never too old to set another goal or to dream a new dream.", author: "C.S. Lewis" },
        { text: "If you want to lift yourself up, lift up someone else.", author: "Booker T. Washington" },
        { text: "The harder you work for something, the greater you’ll feel when you achieve it.", author: "Unknown" },
        { text: "Dream big and dare to fail.", author: "Norman Vaughan" },
        { text: "Quality is not an act, it is a habit.", author: "Aristotle" },
        { text: "The best revenge is massive success.", author: "Frank Sinatra" },
        { text: "Life is 10% what happens to us and 90% how we react to it.", author: "Charles R. Swindoll" },
        { text: "Do not wait to strike till the iron is hot; but make it hot by striking.", author: "William Butler Yeats" },
        { text: "Great things never come from comfort zones.", author: "Unknown" },

        { text: "The only impossible journey is the one you never begin.", author: "Tony Robbins" },
        { text: "What we think, we become.", author: "Buddha" },
        { text: "Happiness is not something ready made. It comes from your own actions.", author: "Dalai Lama" },
        { text: "Turn your wounds into wisdom.", author: "Oprah Winfrey" },
        { text: "Doubt kills more dreams than failure ever will.", author: "Suzy Kassem" },
        { text: "Be yourself; everyone else is already taken.", author: "Oscar Wilde" },
        { text: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.", author: "Aristotle" },
        { text: "The best way out is always through.", author: "Robert Frost" },
        { text: "Courage is resistance to fear, mastery of fear — not absence of fear.", author: "Mark Twain" },
        { text: "Do one thing every day that scares you.", author: "Eleanor Roosevelt" },
        { text: "A person who never made a mistake never tried anything new.", author: "Albert Einstein" },
        { text: "Your time is limited, so don’t waste it living someone else’s life.", author: "Steve Jobs" },
        { text: "In three words I can sum up everything I’ve learned about life: it goes on.", author: "Robert Frost" },
        { text: "Strive not to be a success, but rather to be of value.", author: "Albert Einstein" },
        { text: "The only person you are destined to become is the person you decide to be.", author: "Ralph Waldo Emerson" },
        { text: "Go confidently in the direction of your dreams.", author: "Henry David Thoreau" },
        { text: "It is never too late to be what you might have been.", author: "George Eliot" },
        { text: "Everything has beauty, but not everyone sees it.", author: "Confucius" },
        { text: "The mind is everything. What you think you become.", author: "Buddha" },
        { text: "Change your thoughts and you change your world.", author: "Norman Vincent Peale" }
    ];

    const pick = quotes[Math.floor(Math.random() * quotes.length)];

    const msg =
        `📖 *QUOTE OF THE MOMENT*\n` +
        `━━━━━━━━━━━━━━━━━━━━\n\n` +
        `_"${pick.text}"_\n\n` +
        `— *${pick.author}*\n\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `_Type ${prefix}quote for another_`;

    await reply(msg);
    break;
}

case 'thief':
case 'sbsnal': {
    try {
        // Must reply to a sticker
        if (!m.quoted) {
            return reply(
                `🎭 *Steal Sticker*\n\n` +
                `*Usage:* Reply to a sticker with:\n` +
                `› ${prefix}take\n` +
                `› ${prefix}take MyPack | MyName\n\n` +
                `*Example:*\n` +
                `› ${prefix}take VICO XMD | RMS`
            );
        }

        const mime = m.quoted.mimetype || '';
        if (!/webp|sticker/.test(mime) && !m.quoted.message?.stickerMessage) {
            return reply('❌ Reply to a *sticker* only.');
        }

        // Pack name & author
        let packname = global.packname || '𝐕𝐈𝐂𝐎 𝐗𝐌𝐃 𓉳';
        let author = global.OWNER_NAME || m.pushName || '𝐑𝐌𝐒';

        if (text) {
            const split = text.split('|');
            if (split[0]?.trim()) packname = split[0].trim();
            if (split[1]?.trim()) author = split[1].trim();
        }

        await reply('⏳ Stealing sticker...');

        // Download sticker
        let mediaBuffer = await empire.downloadMediaMessage(m.quoted);
        if (!mediaBuffer || mediaBuffer.length < 50) {
            return reply('❌ Failed to download sticker.');
        }

        // Rebuild with new pack using wa-sticker-formatter (most reliable)
        const { Sticker } = require('wa-sticker-formatter');
        const sticker = new Sticker(mediaBuffer, {
            pack: packname,
            author: author,
            type: 'default',
            categories: ['🤩', '🎉'],
            id: 'vico-steal',
            quality: 100,
            background: 'transparent'
        });

        const stickerBuffer = await sticker.toBuffer();

        if (!stickerBuffer || stickerBuffer.length < 50) {
            return reply('❌ Failed to process sticker.');
        }

        // Send the stolen sticker (user can long-press → Add to Stickers)
        await empire.sendMessage(m.chat, {
            sticker: stickerBuffer,
            contextInfo: newsletterContext()
        }, { quoted: m });

    } catch (e) {
        console.error('TAKE ERROR:', e);
        reply(`❌ Failed to steal sticker: ${e.message || 'Unknown error'}`);
    }
    break;
}

case 'greet':
case 'howfar': {
    let greets = [
        "How far na? VICO XMD dey online, you dey feel am? 😎",
        "Omo! Na you be this? How body? VICO don active!",
        "My gee! How far? Everything soft? Make we run am!",
        "Boss! You don show. How street dey? 🫡",
        "Aza man don land! How far, you good? 😂",
        "How far my padi? VICO XMD dey here, no dulling!",
        "Oga! You don show face. How levels? Make we cruise!",
        "How far, Idolo? Everything stew? VICO dey set!",
        "Yo yo! How far na? Hope say light dey your side? 💡",
        "Chairman! How far? You don hammer today?",
        "My person! Long time, how far? VICO don miss you!",
        "How far bros? Hope hustle dey pay? No give up!",
        "Sisi! How far? You still dey fine like filter? 😍",
        "How far Alhaji? VICO dey loyal, we dey active!",
        "Omo X 1000! How far? You don chop today? Make I order?",
        "How far legend? Your group don feel VICO today?",
        "Boss lady! How far? VICO XMD dey at your service!",
        "How far my gee? Make we yarn small, you dey free?",
        "Wetin dey sup? How far? VICO XMD don full ground!",
        "How far, cruise master? You ready to catch cruise today?",
        "My main man! How far? Street soft for your side?",
        "How far senior man? Respect! VICO dey hail you!",
        "Oya now, how far? Make we run am, time no dey! ⏰",
        "How far, big vibe? Na you be real MVP today!",
        "How far? No be lie, your presence light up the group! ✨"
    ];

    let msg = greets[Math.floor(Math.random() * greets.length)];

    // If replied to someone → tag them
    if (m.quoted && m.quoted.sender) {
        const target = m.quoted.sender;
        msg = `@${target.split('@')[0]} ${msg}`;

        await empire.sendMessage(m.chat, {
            text: msg,
            mentions: [target],
            contextInfo: newsletterContext()
        }, { quoted: m });
    } else {
        // Normal greet (no tag)
        await reply(msg);
    }
    break;
}

case 'delpair':
case 'unpair':
case 'deletepair': {
    if (!isCreator) return reply('🔒 *Owner only.*');

    const raw = (text || args[0] || '').replace(/[^0-9]/g, '');
    if (!raw || raw.startsWith('0') || !/^\d{7,15}$/.test(raw)) {
        return reply(
            `🗑️ *DELPAIR*\n\n` +
            `*Usage:*\n` +
            `› ${prefix}delpair <number>\n\n` +
            `*Example:*\n` +
            `› ${prefix}delpair 234712727263\n\n` +
            `_Removes the paired session for that number._`
        );
    }

    try {
        const pairingDir = path.join(STORAGE_DIR, 'session-data', 'pairing');

        if (!fs.existsSync(pairingDir)) {
            return reply(`🔴 *No session found*\n\nNumber *+${raw}* is not paired.`);
        }

        // Folder may be stored as "234..." or "234...@s.whatsapp.net"
        const entries = fs.readdirSync(pairingDir, { withFileTypes: true });
        const matched = entries.find(entry => {
            if (!entry.isDirectory()) return false;
            const digits = entry.name.replace(/[^0-9]/g, '');
            return digits === raw;
        });

        if (!matched) {
            return reply(`🔴 *NOT FOUND*\n\n*+${raw}* is not paired.`);
        }

        const targetPath = path.join(pairingDir, matched.name);
        fs.rmSync(targetPath, { recursive: true, force: true });

        // Also clean pairing.json entry if present
        try {
            const pj = path.join(pairingDir, 'pairing.json');
            if (fs.existsSync(pj)) {
                const data = JSON.parse(fs.readFileSync(pj, 'utf8'));
                if (data && (data.number === raw || data.number === `${raw}@s.whatsapp.net`)) {
                    fs.unlinkSync(pj);
                }
            }
        } catch (_) {}

        return reply(
            `🔵 *DEVICE REMOVED*\n\n` +
            `✅ *+${raw}* has been unlinked successfully.\n\n` +
            `_Session deleted. They will need to pair again._`
        );
    } catch (err) {
        console.error('Delpair error:', err);
        return reply(`🔴 *DELETE FAILED*\n\n${err.message}`);
    }
    break;
}

case 'rape':
case 'rp': {
    if (!m.quoted) {
        return reply(
            `👊 *Rape Command*\n\n` +
            `*Usage:* Reply to someone's message with:\n` +
            `› ${prefix}rape\n\n` +
            `It will tag them + send sticker.`
        );
    }

    const victim = m.quoted.sender;
    const attacker = m.sender;
    if (!victim) return reply('❌ Could not detect the person you replied to.');

    const textMsg =
        `@${victim.split('@')[0]} has been raped by @${attacker.split('@')[0]}\n` +
        `Hehe 😈`;

    await empire.sendMessage(m.chat, {
        text: textMsg,
        mentions: [victim, attacker],
        contextInfo: newsletterContext()
    }, { quoted: m });

    try {
        const imgUrl = 'https://files.catbox.moe/9jakdt.jpg';
        const response = await axios.get(imgUrl, {
            responseType: 'arraybuffer',
            timeout: 20000,
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const mediaBuffer = Buffer.from(response.data);
        if (mediaBuffer && mediaBuffer.length > 100) {
            const { Sticker } = require('wa-sticker-formatter');
            const sticker = new Sticker(mediaBuffer, {
                pack: global.packname || '𝐕𝐈𝐂𝐎 𝐗𝐌𝐃 𓉳',
                author: global.OWNER_NAME || '𝐌𝐑 𝐑𝐌𝐒 𓉳',
                type: 'default',
                quality: 100
            });
            const stickerBuffer = await sticker.toBuffer();
            if (stickerBuffer && stickerBuffer.length > 100) {
                await empire.sendMessage(m.chat, {
                    sticker: stickerBuffer,
                    contextInfo: newsletterContext()
                }, { quoted: m });
            }
        }
    } catch (e) {
        console.error('Rape sticker error:', e.message);
    }
    break;
}

case 'owner': {
    try {
        const ownerNum = '2349129873629';
        const ownerName = global.OWNER_NAME || '𝐌𝐑 𝐑𝐌𝐒 𓉳';

        const vcard =
            'BEGIN:VCARD\n' +
            'VERSION:3.0\n' +
            `FN:${ownerName}\n` +
            `ORG:${global.botName || 'VICO XMD'};\n` +
            `TEL;type=CELL;type=VOICE;waid=${ownerNum}:+${ownerNum}\n` +
            'END:VCARD';

        await empire.sendMessage(m.chat, {
            contacts: {
                displayName: ownerName,
                contacts: [{ vcard }]
            },
            contextInfo: newsletterContext()
        }, { quoted: m });

    } catch (e) {
        reply(`❌ Failed to send contact: ${e.message}`);
    }
    break;
}

case 'sensi':
case 'ffsensi':
case 'sensitivity':
case 'ffsensitivity': {
    if (!text) return reply(
        `🎯 *FF SENSI GENERATOR*\n\n` +
        `*Usage:*\n` +
        `› ${prefix}sensi <phone model>, <usage>\n\n` +
        `*Examples:*\n` +
        `› ${prefix}sensi Tecno Pop 9, 6 years\n` +
        `› ${prefix}sensi Redmi Note 12 Pro, 1 year 3 months\n` +
        `› ${prefix}sensi iPhone 14, 8 months\n` +
        `› ${prefix}sensi Samsung A15\n\n` +
        `_0-200 range • Headshot optimized • Device + age specific_`
    );

    // Parse phone + usage
    let phone = text.trim();
    let usage = 'New';

    if (text.includes(',')) {
        const parts = text.split(',').map(s => s.trim()).filter(Boolean);
        phone = parts[0] || 'Generic Device';
        usage = parts.slice(1).join(' ').trim() || 'New';
    } else {
        const match = text.match(/^(.+?)\s+(\d+\s*(?:year|years|yr|yrs|month|months|mo|mos).*)$/i);
        if (match) {
            phone = match[1].trim();
            usage = match[2].trim();
        }
    }

    if (!phone) phone = 'Generic Device';

    const deviceStr = `${phone} ${usage}`.toLowerCase();
    let base = 120;

    // Device family tuning
    if (/redmi|poco|realme|xiaomi|mi\s/.test(deviceStr)) {
        base = 135 + (deviceStr.length % 15);
    } else if (/iphone|ios|apple/.test(deviceStr)) {
        base = 115 + (deviceStr.length % 12);
    } else if (/samsung|vivo|infinix|tecno|itel/.test(deviceStr)) {
        base = 128 + (deviceStr.length % 16);
    } else if (/oneplus|oppo/.test(deviceStr)) {
        base = 132 + (deviceStr.length % 12);
    } else if (/huawei|honor|motorola|nokia|pixel/.test(deviceStr)) {
        base = 124 + (deviceStr.length % 14);
    } else if (/low|2gb|3gb|4gb|budget|entry/.test(deviceStr)) {
        base = 148;
    } else {
        base = 122 + (deviceStr.length % 25);
    }

    // Usage age adjustment
    let years = 0;
    const yearMatch = deviceStr.match(/(\d+(?:\.\d+)?)\s*(year|years|yr|yrs)/i);
    const monthMatch = deviceStr.match(/(\d+(?:\.\d+)?)\s*(month|months|mo|mos)/i);

    if (yearMatch) years += parseFloat(yearMatch[1]) || 0;
    if (monthMatch) years += (parseFloat(monthMatch[1]) || 0) / 12;
    if (!yearMatch && !monthMatch) {
        years = (deviceStr.length % 4) * 0.4 + 0.3;
    }

    base = Math.max(90, Math.min(170, base + Math.floor(years * 2.5)));

    // Deterministic hash (same input = same result)
    let hash = 0;
    for (let i = 0; i < deviceStr.length; i++) {
        hash = ((hash << 5) - hash) + deviceStr.charCodeAt(i);
        hash |= 0;
    }
    const seed = Math.abs(hash) % 45;
    base += seed - 22;

    const micro = (Math.abs(hash) % 13) - 6;
    base += micro;
    base = Math.max(45, Math.min(185, Math.floor(base)));

    const clamp = (v) => Math.max(0, Math.min(200, Math.round(v)));

    let general  = clamp(base * (0.96 + ((Math.abs(hash) % 10) / 100)));
    let redDot   = clamp(base * (1.04 + ((Math.abs(hash >> 3) % 8) / 100)));
    let scope2x  = clamp(base * (0.87 + ((Math.abs(hash >> 5) % 9) / 100)));
    let scope4x  = clamp(base * (0.74 + ((Math.abs(hash >> 7) % 7) / 100)));
    let sniper   = clamp(base * (0.61 + ((Math.abs(hash >> 9) % 6) / 100)));
    let freeLook = clamp(base * (0.91 + ((Math.abs(hash >> 2) % 5) / 100)));

    // Keep values distinct
    const vals = [general, redDot, scope2x, scope4x, sniper, freeLook];
    for (let i = 1; i < vals.length; i++) {
        if (Math.abs(vals[i] - vals[i - 1]) < 4) {
            vals[i] = clamp(vals[i] + (i % 2 === 0 ? 6 : -5));
        }
    }

    const msg =
        `🎯 *FF SENSI — HEADSHOT MODE*\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `📱 *Device:* ${phone}\n` +
        `⏱️ *Usage:* ${usage}\n` +
        `━━━━━━━━━━━━━━━━━━━━\n\n` +
        `⚙️ *General:*     *${vals[0]}*\n` +
        `🔴 *Red Dot:*     *${vals[1]}*\n` +
        `🔍 *2x Scope:*    *${vals[2]}*\n` +
        `🔭 *4x Scope:*    *${vals[3]}*\n` +
        `🎯 *Sniper/AWM:*  *${vals[4]}*\n` +
        `👁️ *Free Look:*   *${vals[5]}*\n\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `💡 *Tip:* Paste these values in Free Fire → Settings → Sensitivity\n` +
        `🔥 Practice in Training Ground for best results\n\n` +
        `_Powered by RMS TECH_`;

    await reply(msg);
    break;
}

        // ═══════════════════════════════════════════════════
        // 18. JAIL/UNJAIL
        // ═══════════════════════════════════════════════════
        case 'mute':
        case 'jail': {
            if (!isGroup) return reply("👥 Group only!");
            if (!isCreator && !isAdmins) return reply("❌ Admins only!");
            if (!isBotAdmins) return reply("❌ Bot must be admin to jail (needs delete permission).");
            let target = m.mentionedJid?.[0] || (m.quoted ? m.quoted.sender : null);
            if (!target) return reply(`Usage: ${prefix}jail @user <reason>`);
            if (target === botNumber) return reply("❌ Can't jail the bot!");
            if (groupAdmins.includes(target) || isGroupAdmin(groupMetadata, [target])) {
                return reply("❌ Admins cannot be jailed or prisoned.");
            }
            const reason = text.replace(/@\S+/g, '').trim() || "No reason";
            if (!db.jailed) db.jailed = {};
            if (!db.jailed[m.chat]) db.jailed[m.chat] = {};
            db.jailed[m.chat][target] = { reason, until: Date.now() + 60 * 60 * 1000, by: m.sender };
            saveDB();
            await empire.sendMessage(m.chat, {
                text: `🔒 *JAILED*\n👤 @${target.split('@')[0]}\n📌 ${reason}\n⏱️ 1 hour\n\n_All their messages (text/sticker/image/voice) will be deleted._`,
                mentions: [target],
                contextInfo: newsletterContext({ mentionedJid: [target] })
            }, { quoted: m });
            break;
        }

        // ═══════════════════════════════════════════════════
        // Prison - Jail with custom duration
        // Usage: .prison @user 5min Talking too much
        //        .prison 10hours spam
        //        reply to user → .prison 2d reason
        // ═══════════════════════════════════════════════════
        case 'prison': {
            if (!isGroup) return reply("👥 Group only!");
            if (!isCreator && !isAdmins) return reply("❌ Admins only!");
            if (!isBotAdmins) return reply("❌ Bot must be admin to prison (needs delete permission).");

            let target = m.mentionedJid?.[0] || (m.quoted ? m.quoted.sender : null);
            if (target && (groupAdmins.includes(target) || isGroupAdmin(groupMetadata, [target]))) {
                return reply("❌ Admins cannot be jailed or prisoned.");
            }
            if (!target) {
                return reply(
                    `🔒 *prison*\n\n` +
                    `*Usage:*\n` +
                    `› ${prefix}prison @user <time> <reason>\n` +
                    `› Reply to user + ${prefix}prison <time> <reason>\n\n` +
                    `*Time examples:*\n` +
                    `› 30sec / 5min / 2hours / 1d / 3days\n\n` +
                    `*Example:*\n` +
                    `› ${prefix}prison @user 6min Talking too much`
                );
            }
            if (target === botNumber) return reply("❌ Can't jail the bot!");

            // Parse duration from text (e.g. 5min, 2d, 10hours, 30sec)
            const durationMatch = (text || '').match(/(\d+)\s*(sec|secs|second|seconds|min|mins|minute|minutes|hour|hours|hr|hrs|d|day|days)\b/i);
            if (!durationMatch) {
                return reply(
                    `❌ Missing or invalid time!\n\n` +
                    `*Examples:*\n` +
                    `› ${prefix}prison @user 5min reason\n` +
                    `› ${prefix}prison @user 2hours spam\n` +
                    `› ${prefix}prison @user 1d`
                );
            }

            const amount = parseInt(durationMatch[1]);
            const unit = durationMatch[2].toLowerCase();
            let ms = 0;
            let label = '';

            if (/^sec|secs|second|seconds$/.test(unit)) {
                ms = amount * 1000;
                label = `${amount} second${amount > 1 ? 's' : ''}`;
            } else if (/^min|mins|minute|minutes$/.test(unit)) {
                ms = amount * 60 * 1000;
                label = `${amount} minute${amount > 1 ? 's' : ''}`;
            } else if (/^hour|hours|hr|hrs$/.test(unit)) {
                ms = amount * 60 * 60 * 1000;
                label = `${amount} hour${amount > 1 ? 's' : ''}`;
            } else if (/^d|day|days$/.test(unit)) {
                ms = amount * 24 * 60 * 60 * 1000;
                label = `${amount} day${amount > 1 ? 's' : ''}`;
            }

            // Max 30 days safety
            if (ms > 30 * 24 * 60 * 60 * 1000) {
                return reply('❌ Max jail time is 30 days.');
            }
            if (ms < 1000) {
                return reply('❌ Minimum jail time is 1 second.');
            }

            // Reason = everything after the duration token
            let reason = (text || '')
                .replace(/@\S+/g, '')
                .replace(durationMatch[0], '')
                .trim() || 'No reason';

            if (!db.jailed) db.jailed = {};
            if (!db.jailed[m.chat]) db.jailed[m.chat] = {};
            db.jailed[m.chat][target] = {
                reason,
                until: Date.now() + ms,
                by: m.sender
            };
            saveDB();

            await empire.sendMessage(m.chat, {
                text:
                    `🔒 *JAILED*\n` +
                    `━━━━━━━━━━━━━━━━━━━━\n` +
                    `👤 @${target.split('@')[0]}\n` +
                    `📌 Reason: ${reason}\n` +
                    `⏱️ Duration: *${label}*\n` +
                    `👮 By: @${m.sender.split('@')[0]}\n\n` +
                    `_Any message they send will be deleted until time is up._`,
                mentions: [target, m.sender],
                contextInfo: newsletterContext({ mentionedJid: [target, m.sender] })
            }, { quoted: m });
            break;
        }

        case 'unjail':
        case 'release': {
            if (!isGroup) return reply("👥 Group only!");
            if (!isCreator && !isAdmins) return reply("❌ Admins only!");
            let target = m.mentionedJid?.[0] || (m.quoted ? m.quoted.sender : null);
            if (!target) return reply(`Usage: ${prefix}unjail @user`);
            if (db.jailed?.[m.chat]?.[target]) {
                delete db.jailed[m.chat][target];
                saveDB();
                await empire.sendMessage(m.chat, { 
                    text: `🔓 @${target.split('@')[0]} released!`, 
                    mentions: [target],
                    contextInfo: newsletterContext({ mentionedJid: [target] })
                }, { quoted: m });
            } else {
                reply(`❌ User is not jailed.`);
            }
            break;
        }

        // ═══════════════════════════════════════════════════
        // 19. BALANCE
        // ═══════════════════════════════════════════════════
        case 'balance':
        case 'bal': {
            const target = m.mentionedJid?.[0] || m.sender;
            const acc = ensureEconomy(target);
            reply(
`💰 *BALANCE*
👤 @${target.split('@')[0]}
👛 Wallet: ${fmtCoins(acc.wallet)} coins
🏦 Bank: ${fmtCoins(acc.bank)} coins
💎 Total: ${fmtCoins(acc.wallet + acc.bank)} coins`
            );
            break;
        }

        // ═══════════════════════════════════════════════════
        // 23. QR CODE GENERATOR
        // ═══════════════════════════════════════════════════
        case 'qr': {
            if (!text) return reply(`🔳 Usage: ${prefix}qr <text or link>`);
            try {
                const url = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(text)}`;
                await empire.sendMessage(m.chat, {
                    image: { url },
                    caption: `🔳 *QR Code*\n➤ ${text}`,
                    contextInfo: newsletterContext()
                }, { quoted: m });
            } catch (e) {
                reply(`❌ Failed to generate QR code: ${e.message}`);
            }
            break;
        }

        // ═══════════════════════════════════════════════════
        // 24. WEATHER
        // ═══════════════════════════════════════════════════
        case 'weather': {
            if (!text) return reply(`🌦️ Usage: ${prefix}weather <city>`);
            try {
                const res = await axios.get(`https://wttr.in/${encodeURIComponent(text)}?format=%l:+%c+%t+(feels+%f)+|+💧%h+|+💨%w`, { timeout: 15000 });
                reply(`🌦️ *WEATHER*\n➤ ${res.data}`);
            } catch (e) {
                reply(`❌ Couldn't fetch weather for "${text}".`);
            }
            break;
        }

        // ═══════════════════════════════════════════════════
        // 26. DAD JOKE
        // ═══════════════════════════════════════════════════
        case 'joke': {
            try {
                const res = await axios.get('https://icanhazdadjoke.com/', {
                    headers: { Accept: 'application/json' },
                    timeout: 15000
                });
                reply(`😂 *JOKE*\n\n${res.data.joke}`);
            } catch (e) {
                reply('❌ Couldn\'t fetch a joke right now, try again shortly.');
            }
            break;
        }

        // ═══════════════════════════════════════════════════
        // 27. URL SHORTENER
        // ═══════════════════════════════════════════════════
        case 'short':
        case 'shorturl': {
            if (!text) return reply(`🔗 Usage: ${prefix}short <url>`);
            try {
                const res = await axios.get(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(text)}`, { timeout: 15000 });
                reply(`🔗 *SHORT LINK*\n➤ ${res.data}`);
            } catch (e) {
                reply('❌ Failed to shorten that URL.');
            }
            break;
        }


        // ═══════════════════════════════════════════════════════════
        // VICO XMD — 50 NEW GROUP / INTERACTIVE / GAME / HTML COMMANDS
        // ═══════════════════════════════════════════════════════════

        case 'admins':
        case 'admin':
        case 'groupadmins': {
            if (!isGroup) return reply(mess.only.group);
            const admins = groupAdmins.map(id => `• @${id.split('@')[0]}`).join('\n');
            return empire.sendMessage(m.chat, { text: `👑 *GROUP ADMINS*\n\n${admins}`, mentions: groupAdmins, contextInfo: newsletterContext() }, { quoted: m });
        }

        case 'members':
        case 'groupmembers': {
            if (!isGroup) return reply(mess.only.group);
            return reply(`👥 *${groupName}*\n\nMembers: *${participants.length}*\nAdmins: *${groupAdmins.length}*\nGroup ID: \`${m.chat}\``);
        }

        case 'groupid': {
            if (!isGroup) return reply(mess.only.group);
            return reply(`🆔 *GROUP ID*\n\n\`${m.chat}\``);
        }

        case 'link':
        case 'grouplink': {
            if (!isGroup) return reply(mess.only.group);
            if (!isAdmins && !isCreator) return reply(mess.only.admin);
            if (!isBotAdmins) return reply(mess.only.badmin);
            const code = await empire.groupInviteCode(m.chat).catch(() => null);
            return reply(code ? `🔗 *GROUP LINK*\nhttps://chat.whatsapp.com/${code}` : '❌ Unable to get group link.');
        }

        case 'tagadmins': {
            if (!isGroup) return reply(mess.only.group);
            const msg = q || '📢 Admins, attention please!';
            return empire.sendMessage(m.chat, { text: `${msg}\n\n${groupAdmins.map(id => `@${id.split('@')[0]}`).join(' ')}`, mentions: groupAdmins, contextInfo: newsletterContext() }, { quoted: m });
        }

        case 'tagall2': {
            if (!isGroup) return reply(mess.only.group);
            if (!isAdmins && !isCreator) return reply(mess.only.admin);
            const msg = q || '📢 Everyone!';
            return empire.sendMessage(m.chat, { text: `${msg}\n\n${participants.map(p => `@${p.id.split('@')[0]}`).join(' ')}`, mentions: participants.map(p => p.id), contextInfo: newsletterContext() }, { quoted: m });
        }

        case 'groupstats': {
            if (!isGroup) return reply(mess.only.group);
            const bots = participants.filter(p => /@s\.whatsapp\.net$/.test(p.id) && p.id !== m.sender).length;
            return reply(`📊 *GROUP STATS*\n\n👥 Members: ${participants.length}\n👑 Admins: ${groupAdmins.length}\n🤖 Accounts: ${bots}\n📝 Name: ${groupName}`);
        }

        case 'grouptime': {
            if (!isGroup) return reply(mess.only.group);
            return reply(`🕐 *GROUP TIME*\n\n${new Date().toLocaleString('en-NG', { timeZone: 'Africa/Lagos' })}\n📍 Nigeria (WAT)`);
        }

        case 'groupcount': {
            if (!isGroup) return reply(mess.only.group);
            return reply(`🔢 *${groupName}* has *${participants.length}* members.`);
        }

        case 'groupowner6': {
            if (!isGroup) return reply(mess.only.group);
            const ownerP = participants.find(p => p.admin === 'superadmin')?.id;
            return ownerP ? empire.sendMessage(m.chat, { text: `👑 *GROUP OWNER*\n\n@${ownerP.split('@')[0]}`, mentions: [ownerP], contextInfo: newsletterContext() }, { quoted: m }) : reply('ℹ️ Group owner is not available.');
        }

        case 'setwelcome2': {
            if (!isGroup) return reply(mess.only.group);
            if (!isAdmins && !isCreator) return reply(mess.only.admin);
            if (!q) return reply(`Usage: ${prefix}setwelcome2 on | off | <message>`);
            const opt = q.toLowerCase();
            if (opt === 'on' || opt === 'off') setSetting(m.chat, 'welcome', opt === 'on');
            else setSetting(m.chat, 'welcomeMessage', q), setSetting(m.chat, 'welcome', true);
            return reply(`👋 *WELCOME:* ${opt === 'off' ? 'OFF' : 'ON'}${opt !== 'on' && opt !== 'off' ? `\nMessage: ${q}` : ''}`);
        }

        case 'setgoodbye2': {
            if (!isGroup) return reply(mess.only.group);
            if (!isAdmins && !isCreator) return reply(mess.only.admin);
            if (!q) return reply(`Usage: ${prefix}setgoodbye2 on | off | <message>`);
            const opt = q.toLowerCase();
            if (opt === 'on' || opt === 'off') setSetting(m.chat, 'goodbye', opt === 'on');
            else setSetting(m.chat, 'goodbyeMessage', q), setSetting(m.chat, 'goodbye', true);
            return reply(`👋 *GOODBYE:* ${opt === 'off' ? 'OFF' : 'ON'}`);
        }

        case 'adminlist':
        case 'admins2': {
            if (!isGroup) return reply(mess.only.group);
            const mentions = groupAdmins;
            const text = `👑 *GROUP ADMINS*\n\n${mentions.map((id,i)=>`${i+1}. @${id.split('@')[0]}`).join('\n')}`;
            return empire.sendMessage(m.chat,{text,mentions,contextInfo:newsletterContext({mentionedJid:mentions})},{quoted:m});
        }

        case 'nonadmins': {
            if (!isGroup) return reply(mess.only.group);
            const admins = new Set(groupAdmins);
            const list = participants.filter(p=>!admins.has(p.id));
            if (!list.length) return reply('👥 Everyone in this group is an admin.');
            const mentions=list.map(p=>p.id);
            return empire.sendMessage(m.chat,{text:`👥 *NON-ADMINS (${list.length})*\n\n${mentions.map(id=>`• @${id.split('@')[0]}`).join('\n')}`,mentions,contextInfo:newsletterContext({mentionedJid:mentions})},{quoted:m});
        }

        case 'hidetag':
        case 'silenttag': {
            if (!isGroup) return reply(mess.only.group);
            if (!isCreator && !isAdmins) return reply(mess.only.admin);
            const hiddenText = q || '📢 Attention everyone!';
            const mentions = participants.map(p=>p.id);
            return empire.sendMessage(m.chat,{text:hiddenText,mentions,contextInfo:newsletterContext({mentionedJid:mentions})},{quoted:m});
        }

        case 'tag':
        case 'mentionall': {
            if (!isGroup) return reply(mess.only.group);
            if (!isCreator && !isAdmins) return reply(mess.only.admin);
            const mentions=participants.map(p=>p.id);
            return empire.sendMessage(m.chat,{text:`${q||'📢 Everyone!'}\n\n${mentions.map(id=>`@${id.split('@')[0]}`).join(' ')}`,mentions,contextInfo:newsletterContext({mentionedJid:mentions})},{quoted:m});
        }

        case 'add':
        case 'addmember': {
            if (!isGroup) return reply(mess.only.group);
            if (!isCreator && !isAdmins) return reply(mess.only.admin);
            if (!isBotAdmins) return reply(mess.only.badmin);
            const nums=(text.match(/\d{7,15}/g)||[]).map(n=>`${n.replace(/^0+/,'')}@s.whatsapp.net`);
            if (!nums.length) return reply(`Usage: ${prefix}add 2348012345678`);
            const result=await empire.groupParticipantsUpdate(m.chat,nums,'add').catch(e=>({error:e}));
            if (result?.error) return reply(`❌ Failed to add member: ${result.error.message||result.error}`);
            return reply(`✅ Add request sent for *${nums.length}* member(s).`);
        }

        case 'grouplock':
        case 'gclock': {
            if (!isGroup) return reply(mess.only.group);
            if (!isCreator && !isAdmins) return reply(mess.only.admin);
            if (!isBotAdmins) return reply(mess.only.badmin);
            await empire.groupSettingUpdate(m.chat,'announcement');
            return reply('🔒 *GROUP LOCKED*\nOnly admins can send messages.');
        }

        case 'groupopen':
        case 'gcopen': {
            if (!isGroup) return reply(mess.only.group);
            if (!isCreator && !isAdmins) return reply(mess.only.admin);
            if (!isBotAdmins) return reply(mess.only.badmin);
            await empire.groupSettingUpdate(m.chat,'not_announcement');
            return reply('🔓 *GROUP OPENED*\nAll members can send messages.');
        }

        case 'gcmode':
        case 'groupmode': {
            if (!isGroup) return reply(mess.only.group);
            if (!isCreator && !isAdmins) return reply(mess.only.admin);
            const mode=(args[0]||'').toLowerCase();
            if (!['open','close','closed','lock','locked'].includes(mode)) return reply(`⚙️ Usage: ${prefix}groupmode open | close`);
            if (!isBotAdmins) return reply(mess.only.badmin);
            const closed=['close','closed','lock','locked'].includes(mode);
            await empire.groupSettingUpdate(m.chat,closed?'announcement':'not_announcement');
            return reply(closed?'🔒 *GROUP MODE:* ADMINS ONLY':'🔓 *GROUP MODE:* EVERYONE');
        }

        case 'membercount':
        case 'gcmembers': {
            if (!isGroup) return reply(mess.only.group);
            return reply(`👥 *${groupName}*\n\nMembers: *${participants.length}*\nAdmins: *${groupAdmins.length}*\nRegular members: *${Math.max(0,participants.length-groupAdmins.length)}*`);
        }

        case 'groupstat':
        case 'gcstats': {
            if (!isGroup) return reply(mess.only.group);
            const botAdmin=isBotAdmins?'🟢 Yes':'🔴 No';
            const creator=isCreator?'🟢 Yes':'⚪ No';
            return reply(`📊 *GROUP STATUS*\n\n📛 ${groupName}\n👥 Members: ${participants.length}\n👑 Admins: ${groupAdmins.length}\n🤖 Bot admin: ${botAdmin}\n👤 Owner: ${creator}`);
        }

        case 'groupmenu': {
            if (!isGroup) return reply(mess.only.group);
            return reply(`╭━━〔 👥 GROUP TOOLS 〕━━╮
│➾ 👥 ${prefix}add
│➾ 👥 ${prefix}addmember
│➾ 👥 ${prefix}adminlist
│➾ 👥 ${prefix}admins
│➾ 👥 ${prefix}admins2
│➾ 👥 ${prefix}demote
│➾ 👥 ${prefix}everyone
│➾ 👥 ${prefix}gcadmins
│➾ 👥 ${prefix}gcdescription
│➾ 👥 ${prefix}gcinfo
│➾ 👥 ${prefix}gclock
│➾ 👥 ${prefix}gcmembers
│➾ 👥 ${prefix}gcmode
│➾ 👥 ${prefix}gcopen
│➾ 👥 ${prefix}gcs
│➾ 👥 ${prefix}gcstats
│➾ 👥 ${prefix}gcstatus
│➾ 👥 ${prefix}groupadmins
│➾ 👥 ${prefix}groupcount
│➾ 👥 ${prefix}groupdesc
│➾ 👥 ${prefix}groupid
│➾ 👥 ${prefix}groupinfo
│➾ 👥 ${prefix}groupjid
│➾ 👥 ${prefix}grouplink
│➾ 👥 ${prefix}grouplink2
│➾ 👥 ${prefix}grouplock
│➾ 👥 ${prefix}groupmembers
│➾ 👥 ${prefix}groupmenu
│➾ 👥 ${prefix}groupmode
│➾ 👥 ${prefix}groupopen
│➾ 👥 ${prefix}groupowner
│➾ 👥 ${prefix}groupstat
│➾ 👥 ${prefix}groupstats
│➾ 👥 ${prefix}groupstatus
│➾ 👥 ${prefix}grouptime
│➾ 👥 ${prefix}hidetag
│➾ 👥 ${prefix}jail
│➾ 👥 ${prefix}kick
│➾ 👥 ${prefix}kickall
│➾ 👥 ${prefix}makeadmin
│➾ 👥 ${prefix}membercount
│➾ 👥 ${prefix}members
│➾ 👥 ${prefix}mentionall
│➾ 👥 ${prefix}mute
│➾ 👥 ${prefix}nonadmins
│➾ 👥 ${prefix}prison
│➾ 👥 ${prefix}promote
│➾ 👥 ${prefix}release
│➾ 👥 ${prefix}remove
│➾ 👥 ${prefix}resetgrouplink
│➾ 👥 ${prefix}resetlink
│➾ 👥 ${prefix}revokelink
│➾ 👥 ${prefix}setdesc
│➾ 👥 ${prefix}setdescription
│➾ 👥 ${prefix}setgcname
│➾ 👥 ${prefix}setname
│➾ 👥 ${prefix}setsubject
│➾ 👥 ${prefix}silenttag
│➾ 👥 ${prefix}tagadmins
│➾ 👥 ${prefix}tagall
│➾ 👥 ${prefix}tagall2
│➾ 👥 ${prefix}unadmin
│➾ 👥 ${prefix}unjail
╰━━━━━━━━━━━━━━━━━━━━╯`);
        }

        case 'rps': {
            const choices = ['rock','paper','scissors'];
            const user = q.toLowerCase();
            if (!choices.includes(user)) return reply(`✊ *RPS*\nUse: ${prefix}rps rock\nUse: ${prefix}rps paper\nUse: ${prefix}rps scissors`);
            const bot = choices[randInt(0,2)];
            const win = (user === 'rock' && bot === 'scissors') || (user === 'paper' && bot === 'rock') || (user === 'scissors' && bot === 'paper');
            return reply(`🎮 *RPS*\n\nYou: *${user}*\nVICO: *${bot}*\n\n${user === bot ? '🤝 Draw!' : win ? '🏆 You win!' : '😎 VICO wins!'}`);
        }

        case 'dice': return reply(`🎲 *DICE*\n\nYou rolled: *${randInt(1,6)}*`);
        case 'coin': return reply(`🪙 *COIN FLIP*\n\nResult: *${Math.random() < .5 ? 'HEADS' : 'TAILS'}*`);
        case 'eightball': {
            const answers = ['Yes ✨','No ❌','Maybe 🤔','Definitely 🔥','Ask again later ⏳','It is looking good 😎','Not today 🥶','Absolutely 💯'];
            return q ? reply(`🎱 *8-BALL*\n\nQuestion: ${q}\nAnswer: *${answers[randInt(0,answers.length-1)]}*`) : reply(`Ask a question: ${prefix}eightball Will I win?`);
        }

        case 'guess': {
            const id = gameUserId(m);
            let state = miniGameState.get(id);
            if (!state || state.type !== 'guess') {
                state = { type:'guess', number:randInt(1,20), tries:0 };
                miniGameState.set(id, state);
                return reply(`🎯 *GUESS THE NUMBER*\n\nI'm thinking of a number from *1–20*.\nReply with ${prefix}guess <number>`);
            }
            const n = Number(q);
            if (!Number.isInteger(n) || n < 1 || n > 20) return reply('❌ Enter a whole number from 1 to 20.');
            state.tries++;
            if (n === state.number) {
                miniGameState.delete(id);
                return reply(`🎉 *CORRECT!* You got it in ${state.tries} tries.`);
            }
            return reply(`${n < state.number ? '⬆️ Higher' : '⬇️ Lower'} — try again!`);
        }

        case 'trivia': {
    const triviaQs = [
        ['What is the largest planet in our solar system?',['Earth','Jupiter','Mars','Venus'],1],
        ['How many continents are there?',['5','6','7','8'],2],
        ['What gas do plants absorb?',['Oxygen','Nitrogen','Carbon dioxide','Hydrogen'],2],
        ['Which ocean is the largest?',['Atlantic','Indian','Pacific','Arctic'],2],
        ['Who painted Mona Lisa?',['Van Gogh','Da Vinci','Picasso','Monet'],1],
        ['What is H2O?',['Oxygen','Water','Hydrogen','Salt'],1],
        ['How many legs does a spider have?',['6','8','10','4'],1],
        ['What is the capital of Japan?',['Seoul','Beijing','Tokyo','Bangkok'],2],
        ['Which element has symbol Au?',['Silver','Gold','Aluminum','Argon'],1],
        ['How many sides does a hexagon have?',['5','6','7','8'],1],
        ['What is the fastest land animal?',['Lion','Cheetah','Tiger','Leopard'],1],
        ['Who discovered gravity?',['Newton','Einstein','Galileo','Tesla'],0],
        ['What is 7 x 8?',['54','56','64','48'],1],
        ['Which planet is known as Red Planet?',['Jupiter','Mars','Saturn','Venus'],1],
        ['What is the largest mammal?',['Elephant','Blue Whale','Giraffe','Shark'],1],
        ['How many colors in rainbow?',['6','7','8','5'],1],
        ['What is capital of Nigeria?',['Lagos','Abuja','Kano','Ibadan'],1],
        ['Which language is used for WhatsApp bots?',['Python','JavaScript','C++','Java'],1],
        ['What is the smallest prime number?',['0','1','2','3'],2],
        ['Who is CEO of Meta?',['Elon Musk','Mark Zuckerberg','Sundar','Tim Cook'],1],
        ['What does CPU stand for?',['Central Processing Unit','Computer Power Unit','Central Program Unit','Control Processing Unit'],0],
        ['Which country has Eiffel Tower?',['Italy','France','Spain','Germany'],1],
        ['What is 100 / 4?',['20','25','30','40'],1],
        ['How many hours in a day?',['12','24','48','36'],1],
        ['What is the largest organ in human body?',['Heart','Brain','Skin','Liver'],2],
        ['Which animal can fly?',['Elephant','Bat','Cat','Dog'],1],
        ['What is the chemical symbol for Iron?',['Ir','Fe','I','In'],1],
        ['Who wrote Romeo and Juliet?',['Shakespeare','Dickens','Austen','Twain'],0],
        ['What is 9 squared?',['18','81','72','99'],1],
        ['Which is a programming language?',['Photoshop','Python','Excel','Chrome'],1],
        ['What is capital of Ghana?',['Accra','Kumasi','Lagos','Abidjan'],0],
        ['How many players in football team?',['9','10','11','12'],2],
        ['What is the currency of Japan?',['Yuan','Yen','Won','Ringo'],1],
        ['Which planet has rings?',['Earth','Mars','Saturn','Mercury'],2],
        ['What is 15 + 25?',['35','40','45','30'],1],
        ['Who invented light bulb?',['Tesla','Edison','Newton','Einstein'],1],
        ['What color is chlorophyll?',['Red','Blue','Green','Yellow'],2],
        ['How many teeth adult human have?',['28','32','30','36'],1],
        ['What is largest desert?',['Sahara','Antarctica','Gobi','Arctic'],1],
        ['Which is not a fruit?',['Apple','Carrot','Mango','Banana'],1],
        ['What is 50% of 200?',['50','100','150','200'],1],
        ['Which continent is Egypt in?',['Asia','Africa','Europe','South America'],1],
        ['What is speed of light?',['Fast','300,000 km/s','1,000 km/s','Infinite'],1],
        ['How many bones in human body?',['206','300','150','100'],0],
        ['What is capital of USA?',['New York','Washington DC','LA','Chicago'],1],
        ['Which gas we breathe out?',['Oxygen','Carbon dioxide','Nitrogen','Helium'],1],
        ['What is 12 x 12?',['124','144','132','122'],1],
        ['Who is known as Father of Computer?',['Charles Babbage','Bill Gates','Steve Jobs','Alan Turing'],0],
        ['What is boiling point of water?',['50°C','100°C','0°C','150°C'],1],
        ['Which animal is tallest?',['Elephant','Giraffe','Whale','Camel'],1],
        ['What is 3! (factorial)?',['3','6','9','12'],1],
        ['Which company made iPhone?',['Samsung','Apple','Nokia','Xiaomi'],1],
        ['What is 2 to power 5?',['10','16','32','64'],2],
        ['How many letters in alphabet?',['24','26','28','30'],1]
    ];

    const userId = gameUserId(m);
    const state = miniGameState.get(userId);

    // If already playing trivia, check answer
    if (state && state.type === 'trivia') {
        let ans = parseInt((q || text || '').trim());
        if (!isNaN(ans) && ans >= 1 && ans <= 4) {
            ans = ans - 1; // to 0-index
            if (ans === state.answer) {
                miniGameState.delete(userId);
                return reply(`✅ *CORRECT!* 🎉\n\nAnswer: *${state.opts[ans]}*\n\nType ${prefix}trivia to play again`);
            } else {
                miniGameState.delete(userId);
                return reply(`❌ *WRONG!*\n\nCorrect was: *${state.opts[state.answer]}* (${state.answer+1})\n\nType ${prefix}trivia for new question`);
            }
        } else {
            return reply(`🧠 You have active trivia:\n${state.question}\n\n1️⃣ ${state.opts[0]}\n2️⃣ ${state.opts[1]}\n3️⃣ ${state.opts[2]}\n4️⃣ ${state.opts[3]}\n\nReply: ${prefix}trivia 1-4`);
        }
    }

    const [question, opts, answer] = triviaQs[randInt(0, triviaQs.length - 1)];
    miniGameState.set(userId, { type: 'trivia', question, opts, answer });
    return reply(`🧠 *TRIVIA*\n\n${question}\n\n1️⃣ ${opts[0]}\n2️⃣ ${opts[1]}\n3️⃣ ${opts[2]}\n4️⃣ ${opts[3]}\n\nReply: ${prefix}trivia 1-4`);
}

case 'mathgame':
case 'math': {
    const userId = gameUserId(m);
    let args = (q || text || '').trim();
    const state = miniGameState.get(userId);

    function genSimpleQuestion() {
        const rand = Math.random();
        let a, b, op;
        op = ['+', '-', 'x'][randInt(0, 2)];

        if (rand < 0.7) {
            // 70% : 2-digit + 1-digit (most common)
            a = randInt(10, 99);
            b = randInt(1, 9);
            if (op === 'x' && a > 20) a = randInt(10, 20); // keep x easy
        } else if (rand < 0.9) {
            // 20% : 2-digit + 2-digit
            a = randInt(10, 99);
            b = randInt(10, 99);
            if (op === 'x') {
                a = randInt(10, 30);
                b = randInt(2, 12);
            }
        } else {
            // 10% : 3-digit rarely
            a = randInt(100, 999);
            b = randInt(10, 99);
            if (op === 'x') {
                a = randInt(100, 200);
                b = randInt(2, 9);
            }
        }

        if (op === '-' && a < b) [a, b] = [b, a];

        const answer = op === '+' ? a + b : op === '-' ? a - b : a * b;
        return { qStr: `${a} ${op} ${b}`, answer };
    }

    // Check answer if already in game
    if (state && state.type === 'mathgame') {
        if (args !== '' && !isNaN(args)) {
            const userAns = Number(args);
            if (userAns === state.answer) {
                miniGameState.delete(userId);
                return reply(
                    `Correct 💯✅\n` +
                    `${state.q} = ${state.answer}\n\n` +
                    `Type ${prefix}mathgame for next question`
                );
            } else {
                miniGameState.delete(userId);
                return reply(
                    `❌ WRONG!\n` +
                    `${state.q} = ${state.answer}\n` +
                    `You: ${userAns}\n\n` +
                    `Type ${prefix}mathgame for new one`
                );
            }
        } else {
            // they typed mathgame again without answering, resend current
            return reply(`Answer this question\n    ${state.q}`);
        }
    }

    // No active game -> new question
    const next = genSimpleQuestion();
    miniGameState.set(userId, { 
        type: 'mathgame', 
        answer: next.answer, 
        q: next.qStr, 
        lastActive: Date.now() 
    });

    return reply(`Answer this question\n    ${next.qStr}`);
}

case 'scramble': {
    const words = ['javascript','whatsapp','computer','galaxy','football','rainbow','developer','interactive','universe','keyboard','mountain','chocolate','airplane','elephant','building'];
    const userId = gameUserId(m);
    const state = miniGameState.get(userId);

    if (state && state.type === 'scramble') {
        const userWord = (q || text || '').trim().toLowerCase();
        if (userWord) {
            if (userWord === state.answer) {
                miniGameState.delete(userId);
                return reply(`✅ *CORRECT!* 🎉 Word was *${state.answer}*\n\nType ${prefix}scramble for new word`);
            } else {
                return reply(`❌ *WRONG!* Try again\nUnscramble: *${state.scrambled}*\nReply: ${prefix}scramble <word>`);
            }
        } else {
            return reply(`🔤 Active: Unscramble *${state.scrambled}*\nReply: ${prefix}scramble <word>`);
        }
    }

    const word = words[randInt(0, words.length - 1)];
    const scrambled = word.split('').sort(() => Math.random() -.5).join('');
    miniGameState.set(userId, { type: 'scramble', answer: word, scrambled });
    return reply(`🔤 *WORD SCRAMBLE*\n\nUnscramble: *${scrambled}*\n\nReply: ${prefix}scramble <word>\nExample: ${prefix}scramble ${word}`);
}

case 'wordle': {
    const words = ['apple','grape','house','light','world','ocean','music','robot','table','chair','plant','water','earth','heart','smile','phone','cloud','dream','night','magic'];
    const userId = gameUserId(m);
    const state = miniGameState.get(userId);

    if (state && state.type === 'wordle') {
        const guess = (q || text || '').trim().toLowerCase();
        if (!guess) return reply(`🟩 Active WORDLE - 5 letters\nTries: ${state.tries}/6\nReply: ${prefix}wordle <word>`);
        if (guess.length!== 5) return reply(`❌ Must be 5 letters! You typed ${guess.length}\nTry: ${prefix}wordle <5-letter-word>`);

        state.tries++;

        if (guess === state.answer) {
            miniGameState.delete(userId);
            return reply(`✅ *YOU WIN!* 🎉\nWord was *${state.answer}* in ${state.tries} tries!\n\nType ${prefix}wordle for new game`);
        }

        if (state.tries >= 6) {
            miniGameState.delete(userId);
            return reply(`❌ *GAME OVER!* Word was *${state.answer}*\n\nType ${prefix}wordle to try again`);
        }

        // Give hint: 🟩 correct pos, 🟨 wrong pos, ⬛ not in word
        let hint = '';
        for (let i = 0; i < 5; i++) {
            if (guess[i] === state.answer[i]) hint += '🟩';
            else if (state.answer.includes(guess[i])) hint += '🟨';
            else hint += '⬛';
        }

        return reply(`🟩 *WORDLE* ${state.tries}/6\n\nYour guess: *${guess}*\nHint: ${hint}\n🟩=correct pos, 🟨=wrong pos, ⬛=not in word\n\nReply: ${prefix}wordle <word>`);
    }

    const word = words[randInt(0, words.length - 1)];
    miniGameState.set(userId, { type: 'wordle', answer: word, tries: 0 });
    return reply(`🟩 *MINI WORDLE*\n\nGuess a 5-letter word. You have 6 tries!\nReply: ${prefix}wordle <word>\nExample: ${prefix}wordle house`);
}
           
        case 'snake':
        case 'snakegame':
        case 'snk':
            return executeRichGame(empire, m, m.chat, 'snake');

        case 'blackjack':
            return executeRichGame(empire, m, m.chat, 'blackjack');
            
            case 'word':
            return executeRichGame(empire, m, m.chat, 'word');
            
            case 'space':
            return executeRichGame(empire, m, m.chat, 'space'); 
            
            case 'fightgame':
            return executeRichGame(empire, m, m.chat, 'fight');
            
            case 'pacman':
            return executeRichGame(empire, m, m.chat, 'pacman');
           
           case 'tictactoe':
            return executeRichGame(empire, m, m.chat, 'tictactoe');
           
           case 'tetris':
            return executeRichGame(empire, m, m.chat, 'tetris');
           
            case 'slide':
            return executeRichGame(empire, m, m.chat, 'slide');
              
            case 'memory':
            return executeRichGame(empire, m, m.chat, 'memory');
            
            case 'cargame':
            return executeRichGame(empire, m, m.chat, 'car');
            
            case 'hang':
            return executeRichGame(empire, m, m.chat, 'hang');
            
            case 'whackgame':
            return executeRichGame(empire, m, m.chat, 'whack');

        case 'roulette':
            return executeRichGame(empire, m, m.chat, 'roulette');
        case 'wyr': return reply(`🤔 *WOULD YOU RATHER?*\n\n${['Be able to fly 🪽 or become invisible 👻?','Have unlimited money 💰 or unlimited time ⏳?','Travel to the future 🚀 or past 🕰️?'][randInt(0,2)]}`);
        case 'never': return reply(`🙈 *NEVER HAVE I EVER*\n\n${['...sent a message to the wrong person?','...laughed at the worst possible time?','...stayed awake all night?'][randInt(0,2)]}`);
        case 'ship': {
            const names=q.split(/\s+/).filter(Boolean);
            if (names.length<2) return reply(`Use: ${prefix}ship Alice Bob`);
            return reply(`💞 *SHIP METER*\n\n${names[0]} ❤️ ${names[1]}\n\nCompatibility: *${randInt(1,100)}%*`);
        }
        case 'rate': {
            if (!q) return reply(`Use: ${prefix}rate something`);
            return reply(`⭐ *RATE*\n\n${q}: *${randInt(1,10)}/10*`);
        }
        case 'complimentme': return reply(`✨ *COMPLIMENT*\n\nYou have main-character energy today. Keep building, keep learning, keep it up, keep winning. 🫶`);
        case 'typegame': {
            const phrases=['VICO XMD IS FAST','JAVASCRIPT POWER','GROUP CHAT LEGEND','I AM HIM','BUILD SOMETHING GREAT'];
            const phrase=phrases[randInt(0,phrases.length-1)];
            miniGameState.set(gameUserId(m), {type:'typegame', answer:phrase});
            return reply(`⌨️ *TYPE CHALLENGE*\n\nType this exactly:\n\n*${phrase}*\n\n${prefix}typegame <text>`);
        }
        case 'speedgame': return reply(`⚡ *SPEED GAME*\n\nYour random speed score: *${randInt(50,100)} WPM*\n\nChallenge a friend and beat it!`);
        case 'memorygame': {
            const seq=Array.from({length:5},()=>['🍎','🍋','🍇','⭐','🔥'][randInt(0,4)]).join('');
            miniGameState.set(gameUserId(m), {type:'memorygame', answer:seq});
            return reply(`🧠 *MEMORY GAME*\n\nRemember this:\n\n${seq}\n\nNow send ${prefix}memorytext <sequence>`);
        }
        case 'higherlower':
            return executeRichGame(empire, m, m.chat, 'higherlower');

        case 'slots':
            return executeRichGame(empire, m, m.chat, 'slots');
        case 'minegame':
            return executeRichGame(empire, m, m.chat, 'mines');
        case 'plinkogame':
            return executeRichGame(empire, m, m.chat, 'plinko');
        case 'crashgame':
            return executeRichGame(empire, m, m.chat, 'crash');
        case 'dicegame':
            return executeRichGame(empire, m, m.chat, 'dice');
        case 'coinflip':
            return executeRichGame(empire, m, m.chat, 'coinflip');
        case 'wheel':
            return executeRichGame(empire, m, m.chat, 'wheel');
        case 'games':
            return reply(`🎮 *VICO RICH GAME HUB*\n\n🎰 │➾ 🧮 ${prefix}advice
│➾ 🧮 ${prefix}average
│➾ 🧮 ${prefix}bal
│➾ 🧮 ${prefix}balance
│➾ 🧮 ${prefix}biblequote
│➾ 🧮 ${prefix}binary
│➾ 🧮 ${prefix}blackjack
│➾ 🧮 ${prefix}bomb
│➾ 🧮 ${prefix}bombgame 
│➾ 🧮 ${prefix}calc
│➾ 🧮 ${prefix}cargame
│➾ 🧮 ${prefix}chars
│➾ 🧮 ${prefix}coin
│➾ 🧮 ${prefix}coinflip
│➾ 🧮 ${prefix}compliment
│➾ 🧮 ${prefix}compliments
│➾ 🧮 ${prefix}count
│➾ 🧮 ${prefix}cpu
│➾ 🧮 ${prefix}crashgame
│➾ 🧮 ${prefix}dare
│➾ 🧮 ${prefix}dare2
│➾ 🧮 ${prefix}date
│➾ 🧮 ${prefix}day
│➾ 🧮 ${prefix}dice
│➾ 🧮 ${prefix}dicegame
│➾ 🧮 ${prefix}divide
│➾ 🧮 ${prefix}echo
│➾ 🧮 ${prefix}fact
│➾ 🧮 ${prefix}fightgame
│➾ 🧮 ${prefix}fliptext
│➾ 🧮 ${prefix}flirt
│➾ 🧮 ${prefix}galaxy
│➾ 🧮 ${prefix}gay
│➾ 🧮 ${prefix}gist
│➾ 🧮 ${prefix}guess
│➾ 🧮 ${prefix}hang
│➾ 🧮 ${prefix}higherlower
│➾ 🧮 ${prefix}insult
│➾ 🧮 ${prefix}insultme
│➾ 🧮 ${prefix}joke
│➾ 🧮 ${prefix}jokegame
│➾ 🧮 ${prefix}length
│➾ 🧮 ${prefix}lowercase
│➾ 🧮 ${prefix}mathfact
│➾ 🧮 ${prefix}mathgame
│➾ 🧮 ${prefix}memory
│➾ 🧮 ${prefix}memorygame
│➾ 🧮 ${prefix}minegame
│➾ 🧮 ${prefix}multiply
│➾ 🧮 ${prefix}never
│➾ 🧮 ${prefix}node
│➾ 🧮 ${prefix}p
│➾ 🧮 ${prefix}pacman
│➾ 🧮 ${prefix}password
│➾ 🧮 ${prefix}percent
│➾ 🧮 ${prefix}pick
│➾ 🧮 ${prefix}ping
│➾ 🧮 ${prefix}planet
│➾ 🧮 ${prefix}platform
│➾ 🧮 ${prefix}plinkogame
│➾ 🧮 ${prefix}power
│➾ 🧮 ${prefix}proverb
│➾ 🧮 ${prefix}qr
│➾ 🧮 ${prefix}quaranquote
│➾ 🧮 ${prefix}quiz
│➾ 🧮 ${prefix}quranquote
│➾ 🧮 ${prefix}qz
│➾ 🧮 ${prefix}rate
│➾ 🧮 ${prefix}recipe
│➾ 🧮 ${prefix}repeat
│➾ 🧮 ${prefix}roast
│➾ 🧮 ${prefix}roulette
│➾ 🧮 ${prefix}rps
│➾ 🧮 ${prefix}sciencefact
│➾ 🧮 ${prefix}scramble
│➾ 🧮 ${prefix}server
│➾ 🧮 ${prefix}ship
│➾ 🧮 ${prefix}short
│➾ 🧮 ${prefix}shorturl
│➾ 🧮 ${prefix}slide
│➾ 🧮 ${prefix}slots
│➾ 🧮 ${prefix}snake
│➾ 🧮 ${prefix}snakegame
│➾ 🧮 ${prefix}space
│➾ 🧮 ${prefix}speedgame
│➾ 🧮 ${prefix}stupid
│➾ 🧮 ${prefix}sum
│➾ 🧮 ${prefix}tetris
│➾ 🧮 ${prefix}tictactoe
│➾ 🧮 ${prefix}time
│➾ 🧮 ${prefix}timestamp
│➾ 🧮 ${prefix}timezone
│➾ 🧮 ${prefix}tinytext
│➾ 🧮 ${prefix}trivia
│➾ 🧮 ${prefix}truth
│➾ 🧮 ${prefix}truth2
│➾ 🧮 ${prefix}typegame
│➾ 🧮 ${prefix}uppercase
│➾ 🧮 ${prefix}uuid
│➾ 🧮 ${prefix}weather
│➾ 🧮 ${prefix}whackgame
│➾ 🧮 ${prefix}wheel
│➾ 🧮 ${prefix}word
│➾ 🧮 ${prefix}wordle
│➾ 🧮 ${prefix}words
│➾ 🧮 ${prefix}wyr
│➾ 🧮 ${prefix}yarn`);

        case 'pick': {
            const items=q.split(',').map(x=>x.trim()).filter(Boolean);
            return items.length ? reply(`🎯 *PICKED:* ${items[randInt(0,items.length-1)]}`) : reply(`Use: ${prefix}pick pizza, burger, rice`);
        }
        case 'fact': {
            const facts=['Honey never spoils when stored properly.','Octopuses have three hearts.','Bananas are berries botanically.','A day on Venus is longer than its year.'];
            return reply(`💡 *RANDOM FACT*\n\n${facts[randInt(0,facts.length-1)]}`);
        }
        case 'jokegame': {
            const jokes=['Why do programmers prefer dark mode? Because light attracts bugs. 🐛','I told my computer I needed a break… it said “no problem, I’ll go to sleep.” 😂','Why was JavaScript so calm? It knew how to handle its promises. 😎'];
            return reply(`😂 *JOKE*\n\n${jokes[randInt(0,jokes.length-1)]}`);
        }

       
        // ═══════════════════════════════════════════════════
        case 'pair': {
            if (!isCreator) return reply('🔒 *Owner only.*');
            const raw=(args[0]||'').replace(/[^0-9]/g,'');
            if(!raw||raw.startsWith('0')||!/^\d{7,15}$/.test(raw)) return reply(`📱 Usage: ${prefix}pair <number>\nExample: ${prefix}pair 2348012345678`);
            const jid=`${raw}@s.whatsapp.net`;
            try { await startpairing(jid); const file=path.join(STORAGE_DIR,'session-data','pairing','pairing.json'); let code=null,started=Date.now(); while(Date.now()-started<20000){await new Promise(r=>setTimeout(r,1000));if(!fs.existsSync(file))continue;try{const d=JSON.parse(fs.readFileSync(file,'utf8'));if(d.number===jid&&new Date(d.timestamp||0).getTime()>=started){code=d.code;break}}catch(_){}} return reply(code?`📱 *PAIRING CODE*\n\nNumber: +${raw}\nCode: *${code}*\n\nWhatsApp → Linked Devices → Link with phone number.`:`⏳ Pairing started for *+${raw}*, but no code was returned yet.`); } catch(e){return reply(`❌ Pairing failed: ${e.message}`)}
        }
        case 'listpair': {
            if(!isCreator)return reply('🔒 *Owner only.*'); const dir=path.join(STORAGE_DIR,'session-data','pairing'); if(!fs.existsSync(dir))return reply('📱 *PAIRED DEVICES*\n\nNo paired devices found.'); const entries=fs.readdirSync(dir,{withFileTypes:true}).filter(x=>x.isDirectory()).map(x=>x.name.replace(/[^0-9]/g,'')).filter(Boolean); if(!entries.length)return reply('📱 *PAIRED DEVICES*\n\nNo paired devices found.'); return reply(`📱 *PAIRED DEVICES*\n\n${entries.map((n,i)=>`${i+1}. +${n}`).join('\n')}\n\nTotal: *${entries.length}*`);
        }
        case 'alive': return reply(`⚡ *VICO XMD IS ALIVE*\n\nStatus: Online\nUptime: ${Math.floor(process.uptime())}s\nPrefix: ${prefix}`);
        case 'status': case 'botstatus': return reply(`📊 *BOT STATUS*\n\n🟢 Online\n⏱ Uptime: ${Math.floor(process.uptime())}s\n🧠 RAM: ${(process.memoryUsage().rss/1024/1024).toFixed(1)} MB\n⚙️ Node: ${process.version}`);
        case 'botinfo': return reply(`🤖 *VICO XMD*\n\nOwner: ${global.OWNER_NAME}\nVersion: 80-command build\nMode: ${db.botMode?.mode||'public'}`);
        case 'runtime': return reply(`⏱️ *RUNTIME*\n${Math.floor(process.uptime()/86400)}d ${Math.floor(process.uptime()/3600)%24}h ${Math.floor(process.uptime()/60)%60}m ${Math.floor(process.uptime()%60)}s`);
        case 'time': return reply(`🕒 *TIME:* ${moment().tz('Africa/Lagos').format('HH:mm:ss')} WAT`);
        case 'date': return reply(`📅 *DATE:* ${moment().tz('Africa/Lagos').format('DD/MM/YYYY')}`);
        case 'day': return reply(`📆 *DAY:* ${moment().tz('Africa/Lagos').format('dddd')}`);
        case 'calc': {if(!text)return reply(`🧮 Usage: ${prefix}calc 25*4+10`);if(!/^[0-9+\-*/%().\s]+$/.test(text))return reply('❌ Only basic arithmetic is allowed.');try{return reply(`🧮 *RESULT:* ${Function(`"use strict"; return (${text})`)()}`)}catch{return reply('❌ Invalid expression.')}}
        case 'percent': {const[a,b]=text.split(/\s+/).map(Number);if(!Number.isFinite(a)||!Number.isFinite(b)||b===0)return reply(`Usage: ${prefix}percent <part> <total>`);return reply(`📈 *${a} is ${((a/b)*100).toFixed(2)}% of ${b}*`)}
        case 'average': case 'sum': case 'multiply': {const n=text.split(/[ ,]+/).map(Number).filter(Number.isFinite);if(!n.length)return reply(`Usage: ${prefix}${command} 10 20 30`);const v=command==='average'?n.reduce((a,b)=>a+b,0)/n.length:command==='sum'?n.reduce((a,b)=>a+b,0):n.reduce((a,b)=>a*b,1);return reply(`🔢 *${command.toUpperCase()}:* ${v}`)}
        case 'divide': case 'modulo': {const[a,b]=text.split(/[ ,]+/).map(Number);if(!Number.isFinite(a)||!Number.isFinite(b)||b===0)return reply(`Usage: ${prefix}${command} <a> <b>`);return reply(`🔢 *RESULT:* ${command==='divide'?a/b:a%b}`)}
        case 'power': {const[a,b]=text.split(/[ ,]+/).map(Number);if(!Number.isFinite(a)||!Number.isFinite(b))return reply(`Usage: ${prefix}power <base> <exponent>`);return reply(`⚡ *RESULT:* ${a**b}`)}
        case 'uppercase': return reply(text?text.toUpperCase():`Usage: ${prefix}upper <text>`);
        case 'lowercase': return reply(text?text.toLowerCase():`Usage: ${prefix}lower <text>`);
        case 'length': return reply(text?`📏 Length: *${text.length}*`:`Usage: ${prefix}length <text>`);
        case 'count': case 'words': return reply(text?`🔢 Words: *${text.trim().split(/\s+/).filter(Boolean).length}*`:`Usage: ${prefix}${command} <text>`);
        case 'chars': return reply(text?`🔤 Characters: *${[...text].length}*`:`Usage: ${prefix}chars <text>`);
        case 'binary': return reply(text?[...Buffer.from(text)].map(b=>b.toString(2).padStart(8,'0')).join(' '):`Usage: ${prefix}binary <text>`);
        case 'password': {const chars='ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*';const len=Math.min(64,Math.max(6,Number(text)||16));let out='';for(let i=0;i<len;i++)out+=chars[randInt(0,chars.length-1)];return reply(`🔐 *PASSWORD:*\n\n${out}`)}
        case 'uuid': return reply(`🆔 ${require('crypto').randomUUID()}`);
        case 'jid': return reply(`🆔 *JID:* ${m.sender}`);
        case 'chatid': return reply(`🆔 *CHAT ID:* ${m.chat}`);
        case 'groupjid': return isGroup?reply(`👥 *GROUP JID:* ${m.chat}`):reply('❌ Group only.');
        case 'gcadmins': return isGroup?empire.sendMessage(m.chat,{text:`👮 *ADMINS (${groupAdmins.length})*\n\n${groupAdmins.map(x=>`• @${x.split('@')[0]}`).join('\n')}`,mentions:groupAdmins,contextInfo:newsletterContext()},{quoted:m}):reply('❌ Group only.');
        case 'groupdesc': return isGroup?reply(`📝 *DESCRIPTION*\n\n${groupMetadata?.desc||'No description.'}`):reply('❌ Group only.');
        case 'grouplink2': return isGroup?(isAdmins||isCreator?reply(`🔗 https://chat.whatsapp.com/${await empire.groupInviteCode(m.chat)}`):reply('🔒 Admin only.')):reply('❌ Group only.');
        case 'groupowner': return isGroup?reply(`👑 *OWNER:* ${groupMetadata?.owner?'@'+groupMetadata.owner.split('@')[0]:'Unknown'}`):reply('❌ Group only.');
        case 'botid': return reply(`🤖 *BOT JID:* ${botNumber}`);
        case 'mypp': {const u=m.sender,url=await empire.profilePictureUrl(u,'image').catch(()=>null);return url?empire.sendMessage(m.chat,{image:{url},caption:`🖼️ @${u.split('@')[0]}`,mentions:[u],contextInfo:newsletterContext()},{quoted:m}):reply('❌ Profile picture unavailable.')}
        case 'server': return reply(`🖥️ *SERVER*\nPlatform: ${process.platform}\nArch: ${process.arch}\nNode: ${process.version}`);
        case 'platform': return reply(`💻 ${process.platform} ${process.arch}`);
        case 'node': return reply(`🟢 Node.js ${process.version}`);
        case 'meminfo': return reply(`🧠 RSS: ${(process.memoryUsage().rss/1024/1024).toFixed(2)} MB\nHeap: ${(process.memoryUsage().heapUsed/1024/1024).toFixed(2)} MB`);
        case 'cpu': {const os=require('os');return reply(`🖥️ CPUs: ${os.cpus().length}\nLoad: ${os.loadavg().map(x=>x.toFixed(2)).join(' / ')}`)}
        case 'env': return reply(`⚙️ NODE_ENV: ${process.env.NODE_ENV||'not set'}\nPORT: ${process.env.PORT||'default'}`);
        case 'timezone': return reply(`🌍 *TIMEZONE:* Africa/Lagos\n🕒 ${moment().tz('Africa/Lagos').format('YYYY-MM-DD HH:mm:ss')}`);
        case 'timestamp': return reply(`⏱️ ${Date.now()}`);
        case 'ms': {const n=Number(text);return Number.isFinite(n)?reply(`⏱️ ${n} ms = ${(n/1000).toFixed(3)} seconds`):reply(`Usage: ${prefix}ms <milliseconds>`)}
        case 'yesno': return reply(Math.random()<.5?'✅ YES':'❌ NO');
        case 'fliptext': return reply(text?[...text].reverse().join(''):`Usage: ${prefix}fliptext <text>`);
        case 'tinytext': return reply(text?text.split('').join('ᵗⁱⁿʸ'):`Usage: ${prefix}tinytext <text>`);
        case 'mock': return reply(text?[...text].map((c,i)=>i%2?c.toUpperCase():c.toLowerCase()).join(''):`Usage: ${prefix}mock <text>`);
        case 'repeat': case 'echo': return reply(text||`Usage: ${prefix}${command} <text>`);
        case 'timer': {const n=Math.min(60,Math.max(1,Number(text)||5));await reply(`⏲️ Timer set for *${n}s*`);setTimeout(()=>reply(`⏰ *Timer finished!*`),n*1000);break}
        case 'truth2': return reply(['🗣️ What is your biggest goal right now?','😅 What is the funniest thing you have done recently?','💭 What is one thing you want to change?'][randInt(0,2)]);
        case 'dare2': return reply(['🎤 Send a voice note singing for 10 seconds.','😂 Change your profile picture for 5 minutes.','😎 Say something nice to the last person who messaged you.'][randInt(0,2)]);
        
case 'gay': {
    const percent = Math.floor(Math.random() * 61) + 40;
    const ctx = m.message?.extendedTextMessage?.contextInfo;
    if (ctx?.mentionedJid?.[0]) {
        await empire.sendMessage(m.chat, { text: `🏳️‍🌈 @${ctx.mentionedJid[0].split('@')[0]} is ${percent}% gay!`, mentions: ctx.mentionedJid }, { quoted: m });
        break;
    }
    if (m.quoted) {
        const p = ctx?.participant;
        if (p) {
            await empire.sendMessage(m.chat, { text: `🏳️‍🌈 @${p.split('@')[0]} is ${percent}% gay!`, mentions: [p] }, { quoted: m });
            break;
        }
    }
    reply(`🏳️‍🌈 You are ${percent}% gay!`);
    break;
}

case 'stupid': {
    const percent = Math.floor(Math.random() * 61) + 40;
    const ctx = m.message?.extendedTextMessage?.contextInfo;
    if (ctx?.mentionedJid?.[0]) {
        await empire.sendMessage(m.chat, { text: `🤪 @${ctx.mentionedJid[0].split('@')[0]} is ${percent}% stupid!`, mentions: ctx.mentionedJid }, { quoted: m });
        break;
    }
    if (m.quoted) {
        const p = ctx?.participant;
        if (p) {
            await empire.sendMessage(m.chat, { text: `🤪 @${p.split('@')[0]} is ${percent}% stupid!`, mentions: [p] }, { quoted: m });
            break;
        }
    }
    reply(`🤪 You are ${percent}% stupid!`);
    break;
}

case 'planet': {
    const p = planetsData[Math.floor(Math.random() * planetsData.length)];
    reply(`🌍 *You are from planet ${p.name}*\n\n📝 *Characteristics:*\n${p.desc}`);
    break;
}

case 'galaxy': {
    const g = galaxiesData[Math.floor(Math.random() * galaxiesData.length)];
    reply(`🌌 *You are from ${g}*`);
    break;
}

case 'biblequote': {
    const q = bibleQuotes[Math.floor(Math.random() * bibleQuotes.length)];
    reply(`📖 *Bible Inspiration*\n\n${q}`);
    break;
}

case 'quranquote':
case 'quaranquote': {
    const q = quranQuotes[Math.floor(Math.random() * quranQuotes.length)];
    reply(`☪️ *Quran Inspiration*\n\n${q}`);
    break;
}

case 'advice': {
    const a = advices[Math.floor(Math.random() * advices.length)];
    reply(`💡 *Life Advice*\n\n${a}`);
    break;
}

case 'relationship': {
    const relTexts = ["You would die single 💀💀","You would get married soon ❤️","You would have a gf/bf soon 🔥","Omo no partner for u 😹😹💔","Pray for gf/bf 🥲"];
    const txt = Math.random() < 0.55 ? relTexts[0] : relTexts[Math.floor(Math.random() * relTexts.length)];
    reply(`💘 *Relationship Check*\n\n${txt}`);
    break;
}

case 'mathfact': {
    const f = mathFacts[Math.floor(Math.random() * mathFacts.length)];
    reply(`🔢 *Math Fact*\n\n${f}`);
    break;
}

case 'sciencefact': {
    const f = scienceFacts[Math.floor(Math.random() * scienceFacts.length)];
    reply(`🔬 *Science Fact*\n\n${f}`);
    break;
}

case 'recipe': {
    if (!text) { reply(`Usage: ${prefix}recipe cake`); break; }
    try {
        const { data } = await axios.get(`https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(text)}`);
        const meal = data.meals?.[0];
        if (!meal) { reply(`❌ No recipe found for ${text}`); break; }
        let steps = `🍲 *${meal.strMeal}*\n📍 ${meal.strArea}\n\n*Ingredients:*\n`;
        for (let i=1;i<=20;i++) if (meal[`strIngredient${i}`]) steps += `• ${meal[`strIngredient${i}`]} - ${meal[`strMeasure${i}`]}\n`;
        steps += `\n*Instructions:*\n${meal.strInstructions.slice(0,3000)}`;
        await empire.sendMessage(m.chat, { image: { url: meal.strMealThumb }, caption: steps.slice(0,4000) }, { quoted: m });
    } catch(e){ reply('❌ Recipe API error'); }
    break;
}

case 'story': {
    try {
        await reply('📚 *Loading story...* Please wait 10–35 seconds.');
        const delayMs = (Math.floor(Math.random() * 26) + 10) * 1000; // 10-35 sec
        await new Promise(r => setTimeout(r, delayMs));
        const { data } = await axios.get('https://shortstories-api.onrender.com/', { timeout: 20000 });
        const storyText = (data.story || data.title && data.story || JSON.stringify(data)).toString().slice(0, 4000);
        reply(`📚 *Random Story*\n\n${storyText}`);
    } catch (e) {
        reply(`📚 *Story*\n\nOnce upon a time a coder built a legendary bot that never slept...\n\n_Fallback story (API busy)._`);
    }
    break;
}

case 'xdeath': {
    if (!xdeathLinks.length) { reply('❌ Add your links inside xdeathLinks array first\n\nExample:\nconst xdeathLinks = [\n "https://i.imgur.com/abc.jpg",\n "https://i.imgur.com/def.jpg"\n];'); break; }
    const link = xdeathLinks[Math.floor(Math.random()*xdeathLinks.length)];
    await empire.sendMessage(m.chat, { image: { url: link }, caption: '☠️ xdeath' }, { quoted: m });
    break;
}

case 'delete':
case 'del': {
    try {
        const ctx = m.message?.extendedTextMessage?.contextInfo;
        if (!ctx?.stanzaId ||!ctx?.participant) { reply('🗑️ Reply to the message you want to delete.'); break; }
        const deleteKey = { remoteJid: m.chat, id: ctx.stanzaId, participant: ctx.participant };
        await empire.sendMessage(m.chat, { delete: deleteKey });
    } catch(e){ reply('❌ Failed to delete'); }
    break;
}

case 'bomb':
case 'bombgame': {
    const sender = m.sender;
    const timeout = 180000;

    // Get input - can be.bomb 1 or just 1
    let input = (q || text || '').trim().toLowerCase();
    // If no q, try get from body without prefix
    if (!input) {
        try {
            let raw = (m.message?.conversation || m.message?.extendedTextMessage?.text || '').trim().toLowerCase();
            raw = raw.replace(/^\.?bomb(game)?\s*/i, '').trim(); // remove.bomb
            input = raw;
        } catch {}
    }

    // If game already exists for this user
    if (bombState.has(sender)) {
        // Surrender
        if (input === 'suren' || input === 'surrender') {
            const g = bombState.get(sender);
            const b = g.array.find(v => v.emot === '💥');
            await empire.sendMessage(m.chat, { text: `🏳️ You surrendered! Bomb was ${b.number}` }, { quoted: m });
            clearTimeout(g.timeoutId);
            bombState.delete(sender);
            break;
        }

        // Try parse number from.bomb 5 or just 5
        let num = parseInt(input);
        if (isNaN(num)) {
            // try extract first number from string
            const match = input.match(/[1-9]/);
            if (match) num = parseInt(match[0]);
        }

        if (isNaN(num) || num < 1 || num > 9) {
            // Show current board again if invalid
            const game = bombState.get(sender);
            let teks = `乂 B O M B - Continue\nSend.bomb 1-9 or just number:\nType *suren* to surrender\n\n`;
            for (let i = 0; i < game.array.length; i += 3) {
                teks += game.array.slice(i, i + 3).map(v => v.state? v.emot : v.number).join('') + '\n';
            }
            await empire.sendMessage(m.chat, { text: teks }, { quoted: m });
            break;
        }

        const game = bombState.get(sender);
        const sel = game.array.find(v => v.position === num);
        if (!sel) break;
        if (sel.state) {
            await empire.sendMessage(m.chat, { text: `Box ${sel.number} already opened! Choose another.\nSend.bomb 1-9` }, { quoted: m });
            break;
        }

        sel.state = true;

        if (sel.emot === '💥') {
            let teks = `💥 BOMB EXPLODED! You hit box ${sel.number}\n\n`;
            for (let i = 0; i < game.array.length; i += 3) teks += game.array.slice(i, i + 3).map(v => v.emot).join('') + '\n';
            teks += `\nGame over! Type.bomb to start new game`;
            await empire.sendMessage(m.chat, { text: teks }, { quoted: m });
            clearTimeout(game.timeoutId);
            bombState.delete(sender);
            break;
        }

        const safe = game.array.filter(v => v.emot === '✅' && v.state);
        if (safe.length === 8) {
            let teks = `🎉 YOU WIN! All 8 safe boxes opened!\n\n`;
            for (let i = 0; i < game.array.length; i += 3) teks += game.array.slice(i, i + 3).map(v => v.emot).join('') + '\n';
            await empire.sendMessage(m.chat, { text: teks }, { quoted: m });
            clearTimeout(game.timeoutId);
            bombState.delete(sender);
            break;
        }

        let teks = `乂 B O M B\nBox ${sel.number} opened: ${sel.emot} ✅\nSafe: ${safe.length}/8\n\n`;
        for (let i = 0; i < game.array.length; i += 3) teks += game.array.slice(i, i + 3).map(v => v.state? v.emot : v.number).join('') + '\n';
        teks += `\nSend.bomb 1-9 to continue | *suren* to quit`;
        await empire.sendMessage(m.chat, { text: teks }, { quoted: m });
        break;
    }

    // No game - create new one
    const bom = ['💥', '✅', '✅', '✅', '✅', '✅', '✅', '✅', '✅'].sort(() => Math.random() - 0.5);
    const number = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣'];
    const array = bom.map((v, i) => ({ emot: v, number: number[i], position: i + 1, state: false }));

    let teks = `乂 B O M B - New Game\nSend.bomb 1-9 to open boxes:\nType *suren* to surrender\n\n`;
    for (let i = 0; i < array.length; i += 3) teks += array.slice(i, i + 3).map(v => v.number).join('') + '\n';

    const gmsg = await empire.sendMessage(m.chat, { text: teks }, { quoted: m });
    const tid = setTimeout(() => {
        if (bombState.has(sender)) {
            const g = bombState.get(sender);
            const b = g.array.find(v => v.emot === '💥');
            empire.sendMessage(m.chat, { text: `⏰ Time up! Bomb was ${b.number}\nType.bomb to start again` }, { quoted: m });
            bombState.delete(sender);
        }
    }, timeout);

    bombState.set(sender, { msg: gmsg, array: array, timeoutId: tid });

    // If user already sent.bomb 5 in same command, open it immediately
    if (input) {
        let num = parseInt(input);
        if (!isNaN(num) && num >= 1 && num <= 9) {
            // small delay then process
            setTimeout(async () => {
                if (!bombState.has(sender)) return;
                const game = bombState.get(sender);
                const sel = game.array.find(v => v.position === num);
                if (!sel || sel.state) return;
                sel.state = true;
                let res = `乂 B O M B\nBox ${sel.number} opened: ${sel.emot}\n\n`;
                for (let i = 0; i < game.array.length; i += 3) res += game.array.slice(i, i + 3).map(v => v.state? v.emot : v.number).join('') + '\n';
                if (sel.emot === '💥') {
                    res = `💥 BOMB EXPLODED! Box ${sel.number}\n\n`;
                    for (let i = 0; i < game.array.length; i += 3) res += game.array.slice(i, i + 3).map(v => v.emot).join('') + '\n';
                    clearTimeout(game.timeoutId);
                    bombState.delete(sender);
                }
                await empire.sendMessage(m.chat, { text: res }, { quoted: m });
            }, 500);
        }
    }
    break;
}



        default:
            break;
        }

    } catch (err) {
        console.error('Command error:', err);
        if (m?.chat) empire.sendMessage(m.chat, { 
            text: `❌ Error: ${err.message}`,
            contextInfo: newsletterContext()
        }).catch(() => {});
    }
};

// ========== GROUP PARTICIPANTS UPDATE ==========
// Cleaned - removed orphaned anti features logic that had no case commands
async function handleGroupParticipantsWrapper(sock, update) {
    try {
        if (update?.id && update?.participants) {
            const gm = await sock.groupMetadata(update.id).catch(() => null);
            if (gm) {
                if (typeof handleGroupParticipantsUpdate === 'function') {
                    await handleGroupParticipantsUpdate(sock, update, gm, sock.user.id);
                }
                // Check for jailed users (jail/unjail commands exist)
                if (db.jailed?.[update.id]) {
                    for (const p of update.participants) {
                        if (db.jailed[update.id][p]) {
                            const jailedData = db.jailed[update.id][p];
                            if (jailedData.until && Date.now() > jailedData.until) {
                                delete db.jailed[update.id][p];
                                saveDB();
                            } else {
                                await sock.groupParticipantsUpdate(update.id, [p], 'remove').catch(() => {});
                            }
                        }
                    }
                }
            }
        }
    } catch (e) { console.error('Group update error:', e); }
}

// ========== EXPORTS (cleaned - cleaned exports) ==========
botHandler.handleGroupUpdate = handleGroupParticipantsWrapper;
module.exports = botHandler;

// ========== HOT RELOAD ==========
if (!global.__VICO_WATCHER__) {
    global.__VICO_WATCHER__ = true;
    let file = require.resolve(__filename);
    fs.watchFile(file, () => {
        fs.unwatchFile(file);
        global.__VICO_WATCHER__ = false;
        console.log('\x1b[0;32m' + __filename + ' updated!\x1b[0m');
        delete require.cache[file];
        try { require(file); } catch(e) { console.error('Hot reload failed:', e.message); }
    });
}