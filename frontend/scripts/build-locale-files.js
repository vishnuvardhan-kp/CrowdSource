/**
 * SamadhanSetu Complete Multilingual Locales Generator
 * Generates 100% synchronized, authentic translations for all 9 supported languages:
 * English (en), Hindi (hi), Santali (sat), Nagpuri (nag), Mundari (mun),
 * Kurukh (kru), Khortha (kho), Sadri (sad), Panchpargania (pan).
 */

const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.join(__dirname, '..', 'src', 'locales');

// We will construct the dictionary for each language
const locales = {
  en: {},
  hi: {},
  sat: {},
  nag: {},
  mun: {},
  kru: {},
  kho: {},
  sad: {},
  pan: {}
};

// Helper to assign a nested key across all languages
function add(namespace, key, translations) {
  for (const [lang, val] of Object.entries(translations)) {
    if (!locales[lang]) locales[lang] = {};
    if (!locales[lang][namespace]) locales[lang][namespace] = {};
    locales[lang][namespace][key] = val;
  }
}

// =========================================================================
// 1. NAVIGATION (nav)
// =========================================================================
add('nav', 'home', {
  en: 'Home',
  hi: 'मुखपृष्ठ',
  sat: 'ᱢᱩᱞ ᱥᱟᱠᱟᱢ',
  nag: 'मुख पृष्ठ',
  mun: 'ᱢᱩᱬᱩᱛ ᱥᱟᱠᱟᱢ',
  kru: 'मुंद्दा पता',
  kho: 'मुखिया पता',
  sad: 'मुख पृष्ठ',
  pan: 'मुख पृष्ठ'
});

add('nav', 'challenges', {
  en: 'Problems & Needs',
  hi: 'समस्याएं एवं आवश्यकताएं',
  sat: 'ᱮᱴᱠᱮᱴᱚᱬᱮ ᱟᱨ ᱞᱟᱹᱠᱛᱤᱠᱚ',
  nag: 'समस्या आउ जरूरत',
  mun: 'ᱮᱴᱠᱮᱴᱚᱬᱮ ᱟᱨ ᱞᱟᱹᱠᱛᱤ',
  kru: 'मुश्किल आउर ज़रूरत',
  kho: 'समिस्या आर जरूरत',
  sad: 'समस्या आर दरकार',
  pan: 'समस्या आर जरूरत'
});

add('nav', 'my_challenges', {
  en: 'My Submissions',
  hi: 'मेरी शिकायतें',
  sat: 'ᱤᱧᱟᱜ ᱮᱴᱠᱮᱴᱚᱬᱮ ᱠᱚ',
  nag: 'हमर रिपोर्ट',
  mun: 'ᱤᱧᱟᱜ ᱨᱤᱯᱳᱨᱴ',
  kru: 'एंगहाई रिपोर्ट',
  kho: 'हामर रिपोर्ट',
  sad: 'हमार रिपोर्ट',
  pan: 'हामार रिपोर्ट'
});

add('nav', 'submit_problem', {
  en: 'Report a Problem',
  hi: 'समस्या दर्ज करें',
  sat: 'ᱮᱴᱠᱮᱴᱚᱬᱮ ᱨᱤᱯᱳᱨᱴ ᱢᱮ',
  nag: 'समस्या दर्ज करू',
  mun: 'ᱮᱴᱠᱮᱴᱚᱬᱮ ᱚᱞ ᱢᱮ',
  kru: 'समस्या दर्ज केना',
  kho: 'समिस्या दर्ज करा',
  sad: 'समस्या दर्ज करा',
  pan: 'समस्या दर्ज करा'
});

add('nav', 'reviewer_queue', {
  en: 'Reviewer Queue',
  hi: 'समीक्षक कतार',
  sat: 'ᱵᱤᱰᱟᱹᱣ ᱛᱟᱹᱞᱠᱟᱹ',
  nag: 'समीक्षा सूची',
  mun: 'ᱵᱤᱰᱟᱹᱣ ᱛᱟᱹᱞᱠᱟᱹ',
  kru: 'जाँच कतार',
  kho: 'समीक्षा कतार',
  sad: 'जांच सूची',
  pan: 'समीक्षा सूची'
});

add('nav', 'admin_dashboard', {
  en: 'Gov Analytics',
  hi: 'प्रशासनिक विश्लेषण',
  sat: 'ᱥᱚᱨᱠᱟᱨᱤ ᱞᱮᱠᱷᱟ',
  nag: 'सरकारी डैशबोर्ड',
  mun: 'ᱥᱚᱨᱠᱟᱨᱤ ᱰᱮᱥᱵᱳᱨᱰ',
  kru: 'सरकारी लेखा-जोखा',
  kho: 'सरकारी विश्लेषण',
  sad: 'सरकारी डैशबोर्ड',
  pan: 'सरकारी विश्लेषण'
});

add('nav', 'projects', {
  en: 'Projects',
  hi: 'परियोजनाएं',
  sat: 'ᱯᱨᱳᱡᱮᱠᱴ ᱠᱚ',
  nag: 'योजना',
  mun: 'ᱯᱨᱳᱡᱮᱠᱴ',
  kru: 'काज योजना',
  kho: 'परियोजना',
  sad: 'योजना सब',
  pan: 'परियोजना'
});

add('nav', 'organizations', {
  en: 'Partners',
  hi: 'सहयोगी संस्थाएं',
  sat: 'ᱜᱟᱛᱮ ᱜᱟᱶᱛᱟ',
  nag: 'सहयोगी संस्था',
  mun: 'ᱜᱟᱛᱮ ᱜᱟᱶᱛᱟ',
  kru: 'संगी संस्था',
  kho: 'जोड़ल संस्था',
  sad: 'सहयोगी संस्था',
  pan: 'सहयोगी संस्था'
});

add('nav', 'impact', {
  en: 'Impact',
  hi: 'प्रभाव',
  sat: 'ᱚᱨᱡᱚ',
  nag: 'असर',
  mun: 'ᱚᱨᱡᱚ',
  kru: 'असर',
  kho: 'परभाव',
  sad: 'असर',
  pan: 'परभाव'
});

add('nav', 'login', {
  en: 'Sign In',
  hi: 'लॉग इन करें',
  sat: 'ᱵᱚᱞᱚᱱ ᱢᱮ',
  nag: 'लॉग इन',
  mun: 'ᱵᱚᱞᱚᱱ ᱢᱮ',
  kru: 'कोरना',
  kho: 'लॉग इन करा',
  sad: 'लॉग इन करा',
  pan: 'लॉग इन करा'
});

add('nav', 'logout', {
  en: 'Sign Out',
  hi: 'लॉग आउट',
  sat: 'ᱚᱰᱚᱠᱚᱜ ᱢᱮ',
  nag: 'लॉग आउट',
  mun: 'ᱚᱰᱚᱠᱚᱜ ᱢᱮ',
  kru: 'उरखा',
  kho: 'लॉग आउट',
  sad: 'लॉग आउट',
  pan: 'लॉग आउट'
});

add('nav', 'language', {
  en: 'Language',
  hi: 'भाषा',
  sat: 'ᱯᱟᱹᱨᱥᱤ',
  nag: 'भाषा',
  mun: 'ᱯᱟᱹᱨᱥᱤ',
  kru: 'भाषा',
  kho: 'भाखा',
  sad: 'भाषा',
  pan: 'भाषा'
});

add('nav', 'brand_subtitle', {
  en: 'Civic Innovation',
  hi: 'नागरिक नवाचार',
  sat: 'ᱱᱟᱹᱜᱟᱹᱨᱤᱭᱟᱹ ᱱᱟᱶᱟ ᱠᱟᱹᱢᱤ',
  nag: 'नागरिक नवाचार',
  mun: 'ᱱᱟᱹᱜᱟᱹᱨᱤᱭᱟᱹ ᱩᱭᱦᱟᱹᱨ',
  kru: 'प्रजा नवाचार',
  kho: 'नागरिक नवाचार',
  sad: 'नागरिक नवाचार',
  pan: 'नागरिक नवाचार'
});

add('nav', 'brand_tagline', {
  en: 'Government of Jharkhand · Problem Intelligence & Ecosystem Grid',
  hi: 'झारखंड सरकार · समस्या विश्लेषण एवं नवाचार ग्रिड',
  sat: 'ᱡᱷᱟᱨᱠᱷᱚᱸᱰ ᱥᱚᱨᱠᱟᱨ · ᱮᱴᱠᱮᱴᱚᱬᱮ ᱵᱤᱰᱟᱹᱣ ᱟᱨ ᱡᱚᱲᱟᱣ',
  nag: 'झारखंड सरकार · समस्या विश्लेषण आउ ग्रिड',
  mun: 'ᱡᱷᱟᱨᱠᱷᱚᱸᱰ ᱥᱚᱨᱠᱟᱨ · ᱮᱴᱠᱮᱴᱚᱬᱮ ᱟᱨ ᱱᱟᱶᱟ ᱰᱟᱦᱟᱨ',
  kru: 'झारखंड सरकार · समस्या बिचार आउर ग्रिड',
  kho: 'झारखंड सरकार · समिस्या विश्लेषण आर नवाचार ग्रिड',
  sad: 'झारखंड सरकार · समस्या विश्लेषण आर ग्रिड',
  pan: 'झारखंड सरकार · समस्या विश्लेषण आर ग्रिड'
});

add('nav', 'passport', {
  en: 'Capability Passport',
  hi: 'क्षमता पासपोर्ट',
  sat: 'ᱫᱟᱲᱮ ᱯᱟᱥᱯᱳᱨᱴ',
  nag: 'क्षमता पासपोर्ट',
  mun: 'ᱫᱟᱲᱮ ᱯᱟᱥᱯᱳᱨᱴ',
  kru: 'ताकत पासपोर्ट',
  kho: 'खेमता पासपोर्ट',
  sad: 'क्षमता पासपोर्ट',
  pan: 'खेमता पासपोर्ट'
});

add('nav', 'my_eois', {
  en: 'My EOIs',
  hi: 'मेरी रुचि अभिव्यक्ति (EOI)',
  sat: 'ᱤᱧᱟᱜ EOI',
  nag: 'हमर EOI',
  mun: 'ᱤᱧᱟᱜ EOI',
  kru: 'एंगहाई EOI',
  kho: 'हामर EOI',
  sad: 'हमार EOI',
  pan: 'हामार EOI'
});

add('nav', 'onboard_institution', {
  en: 'Onboard Institution',
  hi: 'संस्था जोड़ें',
  sat: 'ᱜᱟᱶᱛᱟ ᱥᱮᱞᱮᱫ ᱢᱮ',
  nag: 'संस्था जोड़ू',
  mun: 'ᱜᱟᱶᱛᱟ ᱥᱮᱞᱮᱫ',
  kru: 'संस्था जोड़ा',
  kho: 'संस्था जोड़ा',
  sad: 'संस्था जोड़ल जाय',
  pan: 'संस्था जोड़ा'
});

add('nav', 'notifications', {
  en: 'Notifications',
  hi: 'सूचनाएं',
  sat: 'ᱵᱟᱰᱟᱭ ᱪᱤᱴᱷᱤ',
  nag: 'सूचना',
  mun: 'ᱥᱩᱪᱱᱟ',
  kru: 'खबरी',
  kho: 'सूचना',
  sad: 'सूचना',
  pan: 'सूचना'
});

add('nav', 'unread', {
  en: 'unread',
  hi: 'अपठित',
  sat: 'ᱵᱟᱝ ᱯᱟᱲᱦᱟᱣ',
  nag: 'बिना पढ़ल',
  mun: 'ᱵᱟᱝ ᱯᱟᱲᱦᱟᱣ',
  kru: 'मला पढ़का',
  kho: 'बिना पढ़ल',
  sad: 'बिना पढ़ल',
  pan: 'बिना पढ़ल'
});

add('nav', 'mark_all_read', {
  en: 'Mark all as read',
  hi: 'सभी को पढ़ा हुआ चिह्नित करें',
  sat: 'ᱡᱚᱛᱚ ᱯᱟᱲᱦᱟᱣ ᱞᱮᱠᱟ ᱪᱤᱱᱦᱟᱹᱣ ᱢᱮ',
  nag: 'सभे के पढ़ल मानू',
  mun: 'ᱡᱚᱛᱚ ᱯᱟᱲᱦᱟᱣ ᱢᱮ',
  kru: 'हूर्मिन पढ़का मना',
  kho: 'सब के पढ़ल मानल जाय',
  sad: 'सभे पढ़ल भेल',
  pan: 'सब पढ़ल मानल जाय'
});

add('nav', 'loading_notifications', {
  en: 'Loading notifications...',
  hi: 'सूचनाएं लोड हो रही हैं...',
  sat: 'ᱵᱟᱰᱟᱭ ᱪᱤᱴᱷᱤ ᱞᱟᱫᱮᱜ ᱠᱟᱱᱟ...',
  nag: 'सूचना लोड होवत आहे...',
  mun: 'ᱥᱩᱪᱱᱟ ᱦᱤᱡᱩᱜ ᱠᱟᱱᱟ...',
  kru: 'खबरी बरआ लग्गी...',
  kho: 'सूचना लोड होवे लागल हे...',
  sad: 'सूचना लोड होत आहे...',
  pan: 'सूचना लोड होवे लागल आछे...'
});

add('nav', 'no_notifications', {
  en: 'No notifications yet.',
  hi: 'अभी कोई सूचना नहीं है।',
  sat: 'ᱱᱤᱛ ᱫᱷᱟᱹᱵᱤᱡ ᱪᱮᱫ ᱵᱟᱰᱟᱭ ᱪᱤᱴᱷᱤ ᱵᱟᱹᱱᱩᱜ-ᱟ᱾',
  nag: 'एखनो कोनो सूचना नखे।',
  mun: 'ᱱᱤᱛ ᱪᱮᱫ ᱥᱩᱪᱱᱟ ᱵᱟᱹᱱᱩᱜ-ᱟ᱾',
  kru: 'अक्कुन गुने खबरी मल्ला।',
  kho: 'एखन कोनो सूचना नयखे।',
  sad: 'अभी कोनो सूचना नखे।',
  pan: 'एखन कोनो सूचना नाई आछे।'
});

add('nav', 'view_details', {
  en: 'View details',
  hi: 'विवरण देखें',
  sat: 'ᱵᱤᱵᱚᱨᱚᱬ ᱧᱮᱞ ᱢᱮ',
  nag: 'पूरा देखू',
  mun: 'ᱵᱤᱥᱛᱟᱨ ᱧᱮᱞ',
  kru: 'पूरा ईरा',
  kho: 'पूरा देखा',
  sad: 'विवरण देखल जाय',
  pan: 'पूरा देखा'
});

add('nav', 'ai_match', {
  en: 'AI Match',
  hi: 'एआई मिलान',
  sat: 'AI ᱢᱮᱪ',
  nag: 'AI मिलान',
  mun: 'AI ᱡᱚᱲᱟᱣ',
  kru: 'AI मिलान',
  kho: 'AI मिलान',
  sad: 'AI मिलान',
  pan: 'AI मिलान'
});

add('nav', 'gov_admin_badge', {
  en: 'Gov/Admin',
  hi: 'प्रशासन/अधिकारी',
  sat: 'ᱥᱚᱨᱠᱟᱨ/ᱪᱟᱪᱞᱟᱣ',
  nag: 'सरकारी/अधिकारी',
  mun: 'ᱥᱚᱨᱠᱟᱨ/ᱪᱟᱪᱞᱟᱣ',
  kru: 'सरकार/अफसर',
  kho: 'सरकार/अधिकारी',
  sad: 'सरकारी/अफसर',
  pan: 'सरकार/अधिकारी'
});

add('nav', 'sign_in_register', {
  en: 'Sign In / Register',
  hi: 'लॉग इन / पंजीकरण',
  sat: 'ᱵᱚᱞᱚᱱ / ᱧᱩᱛᱩᱢ ᱚᱞ',
  nag: 'लॉग इन / खाता बनाउ',
  mun: 'ᱵᱚᱞᱚᱱ / ᱧᱩᱛᱩᱢ ᱚᱞ',
  kru: 'कोरना / खाता कमना',
  kho: 'लॉग इन / खाता बनावा',
  sad: 'लॉग इन / नाम लिखावा',
  pan: 'लॉग इन / खाता बनावा'
});

// =========================================================================
// 2. COMMON (common)
// =========================================================================
add('common', 'loading', {
  en: 'Loading...',
  hi: 'लोड हो रहा है...',
  sat: 'ᱞᱟᱫᱮᱜ ᱠᱟᱱᱟ...',
  nag: 'लोड होवत आहे...',
  mun: 'ᱞᱟᱫᱮᱜ ᱠᱟᱱᱟ...',
  kru: 'बरआ लग्गी...',
  kho: 'लोड होवे लागल हे...',
  sad: 'लोड होत आहे...',
  pan: 'लोड होवे लागल आछे...'
});

add('common', 'submit', {
  en: 'Submit',
  hi: 'जमा करें',
  sat: 'ᱮᱢ ᱢᱮ',
  nag: 'जमा करू',
  mun: 'ᱮᱢ ᱢᱮ',
  kru: 'चिच्चा',
  kho: 'जमा करा',
  sad: 'जमा करा',
  pan: 'जमा करा'
});

add('common', 'cancel', {
  en: 'Cancel',
  hi: 'रद्द करें',
  sat: 'ᱵᱟᱹᱛᱤᱞ ᱢᱮ',
  nag: 'रद्द करू',
  mun: 'ᱵᱟᱹᱛᱤᱞ ᱢᱮ',
  kru: 'अम्बा',
  kho: 'रद्द करा',
  sad: 'रद्द करा',
  pan: 'रद्द करा'
});

add('common', 'save', {
  en: 'Save',
  hi: 'सहेजें',
  sat: 'ᱥᱟᱸᱪᱟᱣ ᱢᱮ',
  nag: 'सहेजू',
  mun: 'ᱥᱟᱸᱪᱟᱣ ᱢᱮ',
  kru: 'सम्भरना',
  kho: 'सहेजा',
  sad: 'सहेज राखू',
  pan: 'सहेजा'
});

add('common', 'back', {
  en: 'Back',
  hi: 'वापस जाएं',
  sat: 'ᱛᱟᱭᱚᱢ ᱥᱮᱱ',
  nag: 'पाछे',
  mun: 'ᱛᱟᱭᱚᱢ',
  kru: 'किच्चा',
  kho: 'पाछू',
  sad: 'पीछे',
  pan: 'पाछू'
});

add('common', 'next', {
  en: 'Continue',
  hi: 'आगे बढ़ें',
  sat: 'ᱞᱟᱦᱟ ᱥᱮᱱ',
  nag: 'आगे',
  mun: 'ᱞᱟᱦᱟ',
  kru: 'मुन्दे',
  kho: 'आगू',
  sad: 'आगे',
  pan: 'आगू'
});

add('common', 'success', {
  en: 'Success',
  hi: 'सफलता',
  sat: 'ᱥᱟᱹᱛ ᱮᱱᱟ',
  nag: 'सफल',
  mun: 'ᱥᱟᱹᱛ',
  kru: 'फतेह',
  kho: 'सफल',
  sad: 'कामियाबी',
  pan: 'सफल'
});

add('common', 'error', {
  en: 'Error',
  hi: 'त्रुटि',
  sat: 'ᱵᱷᱩᱞ',
  nag: 'गलती',
  mun: 'ᱵᱷᱩᱞ',
  kru: 'गल्ती',
  kho: 'गलती',
  sad: 'खराबी',
  pan: 'गलती'
});

add('common', 'view', {
  en: 'View',
  hi: 'देखें',
  sat: 'ᱧᱮᱞ ᱢᱮ',
  nag: 'देखू',
  mun: 'ᱧᱮᱞ',
  kru: 'ईरा',
  kho: 'देखा',
  sad: 'देखू',
  pan: 'देखा'
});

add('common', 'delete', {
  en: 'Delete',
  hi: 'हटाएं',
  sat: 'ᱜᱮᱫ ᱜᱤᱰᱤ',
  nag: 'हटाउ',
  mun: 'ᱜᱤᱰᱤ ᱢᱮ',
  kru: 'पिच्छा',
  kho: 'मेटावा',
  sad: 'हटावा',
  pan: 'मेटावा'
});

add('common', 'select', {
  en: 'Select...',
  hi: 'चुनें...',
  sat: 'ᱵᱟᱪᱷᱟᱣ ᱢᱮ...',
  nag: 'चुनू...',
  mun: 'ᱵᱟᱪᱷᱟᱣ...',
  kru: 'छांटा...',
  kho: 'बाछा...',
  sad: 'चूनू...',
  pan: 'बाछा...'
});

add('common', 'status', {
  en: 'Status',
  hi: 'स्थिति',
  sat: 'ᱦᱟᱞᱚᱛ',
  nag: 'हालत',
  mun: 'ᱦᱟᱞᱚᱛ',
  kru: 'हालत',
  kho: 'हालत',
  sad: 'हालत',
  pan: 'हालत'
});

add('common', 'actions', {
  en: 'Actions',
  hi: 'कार्रवाई',
  sat: 'ᱠᱟᱹᱢᱤᱦᱚᱨᱟ',
  nag: 'काम',
  mun: 'ᱠᱟᱹᱢᱤ',
  kru: 'काज',
  kho: 'कारवाई',
  sad: 'काम',
  pan: 'काम'
});

add('common', 'all', {
  en: 'All',
  hi: 'सभी',
  sat: 'ᱡᱚᱛᱚ',
  nag: 'सभे',
  mun: 'ᱡᱚᱛᱚ',
  kru: 'हूर्मि',
  kho: 'सभे',
  sad: 'सभे',
  pan: 'सभे'
});

add('common', 'search', {
  en: 'Search...',
  hi: 'खोजें...',
  sat: 'ᱥᱮᱸᱫᱽᱨᱟ...',
  nag: 'खोजू...',
  mun: 'ᱥᱮᱸᱫᱽᱨᱟ...',
  kru: 'बेड्डा...',
  kho: 'खोजा...',
  sad: 'खोजल जाय...',
  pan: 'खोजा...'
});

add('common', 'filter', {
  en: 'Filter',
  hi: 'फ़िल्टर',
  sat: 'ᱪᱷᱟᱹᱱᱤ',
  nag: 'छांटू',
  mun: 'ᱪᱷᱟᱹᱱᱤ',
  kru: 'छांटना',
  kho: 'छांटा',
  sad: 'छांटू',
  pan: 'छांटा'
});

add('common', 'clear_filters', {
  en: 'Clear Filters',
  hi: 'फ़िल्टर हटाएं',
  sat: 'ᱪᱷᱟᱹᱱᱤ ᱚᱪᱚᱜ ᱢᱮ',
  nag: 'फ़िल्टर साफ करू',
  mun: 'ᱪᱷᱟᱹᱱᱤ ᱚᱪᱚᱜ',
  kru: 'फ़िल्टर ओथ्रा',
  kho: 'फ़िल्टर हटावा',
  sad: 'फ़िल्टर हटाउ',
  pan: 'फ़िल्टर हटावा'
});

add('common', 'confirm', {
  en: 'Confirm',
  hi: 'पुष्टि करें',
  sat: 'ᱥᱟᱹᱵᱩᱛ ᱢᱮ',
  nag: 'पक्का करू',
  mun: 'ᱥᱟᱹᱵᱩᱛ',
  kru: 'पक्का मना',
  kho: 'पक्का करा',
  sad: 'पक्का करा',
  pan: 'पक्का करा'
});

add('common', 'close', {
  en: 'Close',
  hi: 'बंद करें',
  sat: 'ᱵᱚᱸᱫᱽ ᱢᱮ',
  nag: 'बंद करू',
  mun: 'ᱵᱚᱸᱫᱽ',
  kru: 'मुचना',
  kho: 'बंद करा',
  sad: 'बंद करा',
  pan: 'बंद करा'
});

add('common', 'refresh', {
  en: 'Refresh',
  hi: 'ताज़ा करें',
  sat: 'ᱱᱟᱶᱟ ᱢᱮ',
  nag: 'ताजा करू',
  mun: 'ᱱᱟᱶᱟ',
  kru: 'पुन्ना कमना',
  kho: 'ताजा करा',
  sad: 'ताजा करा',
  pan: 'ताजा करा'
});

add('common', 'edit', {
  en: 'Edit',
  hi: 'संशोधित करें',
  sat: 'ᱥᱩᱫᱷᱨᱟᱹᱣ ᱢᱮ',
  nag: 'बदलू',
  mun: 'ᱥᱟᱡᱟᱣ',
  kru: 'संवराना',
  kho: 'सुधरा',
  sad: 'बदला',
  pan: 'सुधरा'
});

add('common', 'details', {
  en: 'Details',
  hi: 'विवरण',
  sat: 'ᱵᱤᱵᱚᱨᱚᱬ',
  nag: 'विवरण',
  mun: 'ᱵᱤᱵᱚᱨᱚᱬ',
  kru: 'खबरी',
  kho: 'ब्योरा',
  sad: 'विवरण',
  pan: 'ब्योरा'
});

add('common', 'download', {
  en: 'Download',
  hi: 'डाउनलोड',
  sat: 'ᱰᱟᱣᱩᱱᱞᱳᱰ',
  nag: 'डाउनलोड',
  mun: 'ᱰᱟᱣᱩᱱᱞᱳᱰ',
  kru: 'डाउनलोड',
  kho: 'डाउनलोड',
  sad: 'डाउनलोड',
  pan: 'डाउनलोड'
});

add('common', 'upload', {
  en: 'Upload',
  hi: 'अपलोड',
  sat: 'ᱟᱯᱞᱳᱰ',
  nag: 'अपलोड',
  mun: 'ᱟᱯᱞᱳᱰ',
  kru: 'अपलोड',
  kho: 'अपलोड',
  sad: 'अपलोड',
  pan: 'अपलोड'
});

add('common', 'required', {
  en: 'Required',
  hi: 'अनिवार्य',
  sat: 'ᱞᱟᱹᱠᱛᱤᱭᱟᱱ',
  nag: 'जरूरी',
  mun: 'ᱞᱟᱹᱠᱛᱤᱭᱟᱱ',
  kru: 'ज़रूरी',
  kho: 'जरूरी',
  sad: 'दरकार',
  pan: 'जरूरी'
});

add('common', 'optional', {
  en: 'Optional',
  hi: 'वैकल्पिक',
  sat: 'ᱮᱴᱟᱜ',
  nag: 'ऐच्छिक',
  mun: 'ᱵᱟᱪᱷᱟᱣ',
  kru: 'खुशी से',
  kho: 'इच्छा अनुसार',
  sad: 'इच्छा से',
  pan: 'इच्छा अनुसार'
});

add('common', 'not_specified', {
  en: 'Not specified',
  hi: 'अनिर्दिष्ट',
  sat: 'ᱵᱟᱝ ᱚᱞ ᱟᱠᱟᱱ',
  nag: 'निखावल नखे',
  mun: 'ᱵᱟᱝ ᱚᱞ',
  kru: 'मला तिंगका',
  kho: 'बतावल नयखे',
  sad: 'बतावल नखे',
  pan: 'बतावल नाई आछे'
});

add('common', 'none', {
  en: 'None',
  hi: 'कोई नहीं',
  sat: 'ᱪᱮᱫ ᱦᱚᱸ ᱵᱟᱝ',
  nag: 'कोनो नी',
  mun: 'ᱪᱮᱫ ᱦᱚᱸ ᱵᱟᱝ',
  kru: 'नेह मल्ला',
  kho: 'कोनो नय',
  sad: 'कोनो नखे',
  pan: 'कोनो नाई'
});

add('common', 'yes', {
  en: 'Yes',
  hi: 'हाँ',
  sat: 'ᱦᱮᱸ',
  nag: 'हाँ',
  mun: 'ᱦᱮᱸ',
  kru: 'हा',
  kho: 'हाँ',
  sad: 'हाँ',
  pan: 'हाँ'
});

add('common', 'no', {
  en: 'No',
  hi: 'नहीं',
  sat: 'ᱵᱟᱝ',
  nag: 'ना',
  mun: 'ᱵᱟᱝ',
  kru: 'मला',
  kho: 'ना',
  sad: 'ना',
  pan: 'ना'
});

add('common', 'save_draft', {
  en: 'Save Draft',
  hi: 'ड्राफ्ट सहेजें',
  sat: 'ᱪᱷᱟᱸᱪ ᱥᱟᱸᱪᱟᱣ ᱢᱮ',
  nag: 'ड्राफ्ट सहेजू',
  mun: 'ᱪᱷᱟᱸᱪ ᱥᱟᱸᱪᱟᱣ',
  kru: 'ड्राफ्ट सम्भरना',
  kho: 'ड्राफ्ट सहेजा',
  sad: 'ड्राफ्ट सहेजू',
  pan: 'ड्राफ्ट सहेजा'
});

add('common', 'saving', {
  en: 'Saving...',
  hi: 'सहेजा जा रहा है...',
  sat: 'ᱥᱟᱸᱪᱟᱣᱜ ᱠᱟᱱᱟ...',
  nag: 'सहेजत आहे...',
  mun: 'ᱥᱟᱸᱪᱟᱣᱜ ᱠᱟᱱᱟ...',
  kru: 'सम्भरआ लग्गी...',
  kho: 'सहेजल जा रहल हे...',
  sad: 'सहेजत आहे...',
  pan: 'सहेजल जात आछे...'
});

// Write script output
console.log('Writing locale files...');
fs.writeFileSync(path.join(__dirname, 'temp_locales.json'), JSON.stringify(locales, null, 2));
console.log('Done.');
