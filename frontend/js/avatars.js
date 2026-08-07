// ========== GLADIATOR SVG AVATARS ==========
// Každý avatar je SVG kresba reálného gladiátora

const AVATARS = {

  // ===== WARRIOR MALE =====
  'Warrior-male': `<svg viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg">
    <!-- Corinthian helmet -->
    <ellipse cx="50" cy="28" rx="22" ry="18" fill="#8B7355"/>
    <rect x="28" y="28" width="44" height="10" rx="2" fill="#8B7355"/>
    <!-- Helmet crest -->
    <rect x="46" y="10" width="8" height="4" rx="1" fill="#8B0000"/>
    <ellipse cx="50" cy="10" rx="4" ry="8" fill="#8B0000"/>
    <!-- Face opening -->
    <ellipse cx="50" cy="35" rx="10" ry="8" fill="#C8956C"/>
    <!-- Eyes -->
    <ellipse cx="45" cy="33" rx="3" ry="2" fill="#2C1810"/>
    <ellipse cx="55" cy="33" rx="3" ry="2" fill="#2C1810"/>
    <!-- Nose -->
    <path d="M49 35 L51 35 L50 38 Z" fill="#B07850"/>
    <!-- Mouth / beard -->
    <path d="M45 40 Q50 43 55 40" stroke="#5C3A1E" stroke-width="1.5" fill="none"/>
    <rect x="44" y="40" width="12" height="5" rx="2" fill="#5C3A1E"/>
    <!-- Neck -->
    <rect x="45" y="43" width="10" height="8" fill="#C8956C"/>
    <!-- Chest armor / lorica segmentata -->
    <rect x="28" y="51" width="44" height="35" rx="3" fill="#8B7355"/>
    <!-- Armor segments -->
    <line x1="28" y1="60" x2="72" y2="60" stroke="#6B5535" stroke-width="1.5"/>
    <line x1="28" y1="68" x2="72" y2="68" stroke="#6B5535" stroke-width="1.5"/>
    <line x1="28" y1="76" x2="72" y2="76" stroke="#6B5535" stroke-width="1.5"/>
    <!-- Chest emblem -->
    <circle cx="50" cy="63" r="5" fill="#D4AF37" opacity="0.8"/>
    <!-- Shoulder guards -->
    <ellipse cx="28" cy="54" rx="10" ry="6" fill="#7A6445" transform="rotate(-10,28,54)"/>
    <ellipse cx="72" cy="54" rx="10" ry="6" fill="#7A6445" transform="rotate(10,72,54)"/>
    <!-- Left arm + shield -->
    <rect x="10" y="55" width="14" height="28" rx="4" fill="#C8956C"/>
    <rect x="4" y="52" width="16" height="34" rx="6" fill="#8B7355" opacity="0.9"/>
    <rect x="6" y="54" width="12" height="30" rx="5" fill="#A0522D" opacity="0.6"/>
    <line x1="6" y1="69" x2="18" y2="69" stroke="#D4AF37" stroke-width="1"/>
    <line x1="12" y1="54" x2="12" y2="84" stroke="#D4AF37" stroke-width="1"/>
    <!-- Right arm + gladius sword -->
    <rect x="76" y="55" width="14" height="28" rx="4" fill="#C8956C"/>
    <rect x="88" y="48" width="4" height="45" rx="2" fill="#C0C0C0"/>
    <rect x="84" y="54" width="12" height="4" rx="1" fill="#D4AF37"/>
    <!-- Pteruges (leather strips) -->
    <rect x="30" y="84" width="6" height="16" rx="2" fill="#8B6914" opacity="0.9"/>
    <rect x="38" y="84" width="6" height="18" rx="2" fill="#8B6914" opacity="0.9"/>
    <rect x="46" y="84" width="6" height="16" rx="2" fill="#8B6914" opacity="0.9"/>
    <rect x="54" y="84" width="6" height="18" rx="2" fill="#8B6914" opacity="0.9"/>
    <rect x="62" y="84" width="6" height="16" rx="2" fill="#8B6914" opacity="0.9"/>
    <!-- Legs -->
    <rect x="35" y="100" width="12" height="18" rx="3" fill="#C8956C"/>
    <rect x="53" y="100" width="12" height="18" rx="3" fill="#C8956C"/>
    <!-- Greaves -->
    <rect x="35" y="108" width="12" height="10" rx="2" fill="#8B7355"/>
    <rect x="53" y="108" width="12" height="10" rx="2" fill="#8B7355"/>
  </svg>`,

  // ===== WARRIOR FEMALE =====
  'Warrior-female': `<svg viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg">
    <!-- Open helmet with plume -->
    <ellipse cx="50" cy="26" rx="20" ry="16" fill="#8B7355"/>
    <rect x="30" y="26" width="40" height="8" rx="2" fill="#8B7355"/>
    <ellipse cx="50" cy="10" rx="5" ry="10" fill="#8B0000"/>
    <!-- Hair flowing out -->
    <path d="M30 26 Q20 40 22 55" stroke="#4A2C0A" stroke-width="6" fill="none" stroke-linecap="round"/>
    <path d="M70 26 Q80 40 78 55" stroke="#4A2C0A" stroke-width="6" fill="none" stroke-linecap="round"/>
    <!-- Face -->
    <ellipse cx="50" cy="33" rx="12" ry="11" fill="#D4A574"/>
    <!-- Eyes with lashes -->
    <ellipse cx="44" cy="31" rx="3" ry="2.5" fill="#2C1810"/>
    <ellipse cx="56" cy="31" rx="3" ry="2.5" fill="#2C1810"/>
    <line x1="41" y1="28" x2="47" y2="28" stroke="#2C1810" stroke-width="1.2"/>
    <line x1="53" y1="28" x2="59" y2="28" stroke="#2C1810" stroke-width="1.2"/>
    <!-- Lips -->
    <path d="M46 38 Q50 41 54 38" stroke="#8B3A3A" stroke-width="1.5" fill="#C06060"/>
    <!-- Neck -->
    <rect x="45" y="43" width="10" height="8" fill="#D4A574"/>
    <!-- Chest armor - feminine cut -->
    <path d="M28 51 Q50 47 72 51 L72 86 Q50 90 28 86 Z" fill="#8B7355"/>
    <path d="M35 55 Q50 52 65 55 L65 75 Q50 78 35 75 Z" fill="#7A6445"/>
    <!-- Decorative chest band -->
    <path d="M28 64 Q50 61 72 64" stroke="#D4AF37" stroke-width="2" fill="none"/>
    <!-- Shoulder guards -->
    <ellipse cx="27" cy="53" rx="10" ry="5" fill="#7A6445" transform="rotate(-15,27,53)"/>
    <ellipse cx="73" cy="53" rx="10" ry="5" fill="#7A6445" transform="rotate(15,73,53)"/>
    <!-- Left arm + round shield -->
    <rect x="12" y="56" width="12" height="26" rx="4" fill="#D4A574"/>
    <circle cx="10" cy="69" r="12" fill="#8B7355"/>
    <circle cx="10" cy="69" r="9" fill="#A0522D" opacity="0.7"/>
    <circle cx="10" cy="69" r="4" fill="#D4AF37" opacity="0.8"/>
    <!-- Right arm + spear -->
    <rect x="76" y="56" width="12" height="26" rx="4" fill="#D4A574"/>
    <rect x="90" y="20" width="3" height="70" rx="1" fill="#8B6914"/>
    <polygon points="90,20 93,20 91.5,8" fill="#C0C0C0"/>
    <!-- Skirt armor -->
    <rect x="30" y="84" width="6" height="18" rx="2" fill="#8B6914"/>
    <rect x="38" y="84" width="6" height="20" rx="2" fill="#8B6914"/>
    <rect x="46" y="84" width="6" height="18" rx="2" fill="#8B6914"/>
    <rect x="54" y="84" width="6" height="20" rx="2" fill="#8B6914"/>
    <rect x="62" y="84" width="6" height="18" rx="2" fill="#8B6914"/>
    <!-- Legs -->
    <rect x="36" y="100" width="11" height="18" rx="3" fill="#D4A574"/>
    <rect x="53" y="100" width="11" height="18" rx="3" fill="#D4A574"/>
    <rect x="36" y="110" width="11" height="8" rx="2" fill="#8B7355"/>
    <rect x="53" y="110" width="11" height="8" rx="2" fill="#8B7355"/>
  </svg>`,

  // ===== MAGE MALE =====
  'Mage-male': `<svg viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg">
    <!-- Pointed hood/hat -->
    <polygon points="50,2 28,38 72,38" fill="#2C1654"/>
    <ellipse cx="50" cy="38" rx="22" ry="8" fill="#3D2070"/>
    <!-- Stars on hat -->
    <text x="38" y="25" font-size="6" fill="#D4AF37">★</text>
    <text x="52" y="18" font-size="5" fill="#D4AF37">✦</text>
    <text x="56" y="30" font-size="4" fill="#9B7FD4">★</text>
    <!-- Face -->
    <ellipse cx="50" cy="46" rx="13" ry="12" fill="#C8956C"/>
    <!-- Long beard -->
    <path d="M37 52 Q50 70 63 52" fill="#E8E8E8" opacity="0.9"/>
    <rect x="43" y="54" width="14" height="14" rx="5" fill="#E8E8E8" opacity="0.9"/>
    <!-- Eyes - wise -->
    <ellipse cx="44" cy="44" rx="3" ry="2" fill="#1A3A6A"/>
    <ellipse cx="56" cy="44" rx="3" ry="2" fill="#1A3A6A"/>
    <!-- Eyebrows bushy -->
    <path d="M41 41 Q44 39 47 41" stroke="#8B6914" stroke-width="2" fill="none"/>
    <path d="M53 41 Q56 39 59 41" stroke="#8B6914" stroke-width="2" fill="none"/>
    <!-- Robe body -->
    <path d="M25 58 Q50 54 75 58 L80 110 Q50 115 20 110 Z" fill="#2C1654"/>
    <!-- Robe decorations -->
    <path d="M35 65 Q50 62 65 65" stroke="#D4AF37" stroke-width="1.5" fill="none"/>
    <path d="M32 78 Q50 74 68 78" stroke="#9B7FD4" stroke-width="1" fill="none"/>
    <!-- Moon/star emblems on robe -->
    <text x="44" y="80" font-size="8" fill="#D4AF37">☽</text>
    <text x="54" y="95" font-size="6" fill="#9B7FD4">✦</text>
    <!-- Left arm -->
    <path d="M25 58 Q15 75 18 95" stroke="#2C1654" stroke-width="14" fill="none" stroke-linecap="round"/>
    <!-- Right arm + glowing staff -->
    <path d="M75 58 Q85 75 82 95" stroke="#2C1654" stroke-width="14" fill="none" stroke-linecap="round"/>
    <rect x="88" y="25" width="4" height="75" rx="2" fill="#8B6914"/>
    <!-- Staff orb -->
    <circle cx="90" cy="22" r="8" fill="#9B7FD4" opacity="0.8"/>
    <circle cx="90" cy="22" r="5" fill="#D4AF37" opacity="0.9"/>
    <circle cx="90" cy="22" r="3" fill="white" opacity="0.7"/>
    <!-- Glow effect -->
    <circle cx="90" cy="22" r="11" fill="#9B7FD4" opacity="0.2"/>
    <!-- Shoes -->
    <ellipse cx="38" cy="112" rx="10" ry="5" fill="#1A0A2E"/>
    <ellipse cx="62" cy="112" rx="10" ry="5" fill="#1A0A2E"/>
  </svg>`,

  // ===== MAGE FEMALE =====
  'Mage-female': `<svg viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg">
    <!-- Witch hat -->
    <polygon points="50,2 30,36 70,36" fill="#1A0A2E"/>
    <ellipse cx="50" cy="36" rx="24" ry="7" fill="#2C1654"/>
    <path d="M30 36 Q20 42 22 48 Q30 40 50 38 Q70 40 78 48 Q80 42 70 36 Z" fill="#3D2070"/>
    <!-- Stars -->
    <text x="36" y="22" font-size="7" fill="#D4AF37">★</text>
    <text x="55" y="16" font-size="5" fill="#9B7FD4">✦</text>
    <!-- Long magical hair -->
    <path d="M30 36 Q18 55 20 80" stroke="#6B2FA0" stroke-width="7" fill="none" stroke-linecap="round"/>
    <path d="M70 36 Q82 55 80 80" stroke="#6B2FA0" stroke-width="7" fill="none" stroke-linecap="round"/>
    <!-- Face -->
    <ellipse cx="50" cy="46" rx="13" ry="12" fill="#E8C49A"/>
    <!-- Eyes - magical purple -->
    <ellipse cx="44" cy="44" rx="3.5" ry="3" fill="#6B2FA0"/>
    <ellipse cx="56" cy="44" rx="3.5" ry="3" fill="#6B2FA0"/>
    <circle cx="44" cy="44" r="1.5" fill="white"/>
    <circle cx="56" cy="44" r="1.5" fill="white"/>
    <!-- Lips -->
    <path d="M46 51 Q50 54 54 51" stroke="#8B0050" stroke-width="1.5" fill="#C060A0"/>
    <!-- Elegant robe -->
    <path d="M24 58 Q50 53 76 58 L82 115 Q50 118 18 115 Z" fill="#2C1654"/>
    <path d="M24 58 Q50 53 76 58 L76 72 Q50 69 24 72 Z" fill="#3D2070"/>
    <!-- Magical runes on robe -->
    <text x="43" y="85" font-size="9" fill="#D4AF37">✦</text>
    <text x="53" y="100" font-size="7" fill="#9B7FD4">☽</text>
    <!-- Decorative collar -->
    <path d="M30 58 Q50 63 70 58" stroke="#D4AF37" stroke-width="2" fill="none"/>
    <!-- Arms -->
    <path d="M24 60 Q12 78 15 98" stroke="#2C1654" stroke-width="13" fill="none" stroke-linecap="round"/>
    <path d="M76 60 Q88 78 85 98" stroke="#2C1654" stroke-width="13" fill="none" stroke-linecap="round"/>
    <!-- Magic wand -->
    <rect x="88" y="40" width="3" height="55" rx="1.5" fill="#4A2060"/>
    <circle cx="89.5" cy="37" r="6" fill="#D4AF37" opacity="0.9"/>
    <circle cx="89.5" cy="37" r="4" fill="white" opacity="0.8"/>
    <circle cx="89.5" cy="37" r="9" fill="#9B7FD4" opacity="0.2"/>
  </svg>`,

  // ===== ROGUE MALE =====
  'Rogue-male': `<svg viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg">
    <!-- Dark hood -->
    <ellipse cx="50" cy="25" rx="22" ry="20" fill="#1A1A2E"/>
    <path d="M28 25 Q28 45 32 55 L50 50 L68 55 Q72 45 72 25 Z" fill="#1A1A2E"/>
    <!-- Hood shadow -->
    <ellipse cx="50" cy="30" rx="14" ry="12" fill="#0D0D1E"/>
    <!-- One visible eye (other in shadow) -->
    <ellipse cx="56" cy="28" rx="4" ry="3" fill="#2C2C3E"/>
    <ellipse cx="56" cy="28" rx="2.5" ry="2" fill="#CC4400"/>
    <circle cx="56" cy="28" r="1" fill="#FF6622" opacity="0.8"/>
    <!-- Mask/face cloth -->
    <rect x="36" y="32" width="28" height="15" rx="4" fill="#2C2C3E"/>
    <!-- Neck -->
    <rect x="44" y="47" width="12" height="8" fill="#1A1A2E"/>
    <!-- Dark leather armor -->
    <path d="M26 55 Q50 50 74 55 L72 90 Q50 93 28 90 Z" fill="#1A1A2E"/>
    <!-- Leather straps -->
    <line x1="50" y1="55" x2="50" y2="90" stroke="#3A2A1A" stroke-width="2"/>
    <line x1="38" y1="57" x2="42" y2="88" stroke="#3A2A1A" stroke-width="1.5"/>
    <line x1="62" y1="57" x2="58" y2="88" stroke="#3A2A1A" stroke-width="1.5"/>
    <!-- Belt with pouches -->
    <rect x="26" y="80" width="48" height="6" rx="2" fill="#3A2A1A"/>
    <rect x="44" y="79" width="12" height="8" rx="2" fill="#4A3A2A"/>
    <rect x="30" y="79" width="8" height="7" rx="2" fill="#4A3A2A"/>
    <!-- Left arm + dagger -->
    <rect x="12" y="56" width="12" height="28" rx="4" fill="#2C2C2C"/>
    <rect x="6" y="46" width="3" height="28" rx="1.5" fill="#C0C0C0"/>
    <polygon points="6,46 9,46 7.5,38" fill="#A0A0A0"/>
    <rect x="3" y="52" width="9" height="3" rx="1" fill="#8B6914"/>
    <!-- Right arm + two daggers -->
    <rect x="76" y="56" width="12" height="28" rx="4" fill="#2C2C2C"/>
    <rect x="88" y="44" width="3" height="30" rx="1.5" fill="#C0C0C0"/>
    <polygon points="88,44 91,44 89.5,36" fill="#A0A0A0"/>
    <rect x="85" y="50" width="9" height="3" rx="1" fill="#8B6914"/>
    <!-- Dark pants -->
    <rect x="30" y="88" width="16" height="22" rx="3" fill="#1A1A2E"/>
    <rect x="54" y="88" width="16" height="22" rx="3" fill="#1A1A2E"/>
    <!-- Dark boots -->
    <rect x="30" y="104" width="16" height="10" rx="3" fill="#0D0D1E"/>
    <rect x="54" y="104" width="16" height="10" rx="3" fill="#0D0D1E"/>
  </svg>`,

  // ===== ROGUE FEMALE =====
  'Rogue-female': `<svg viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg">
    <!-- Dark assassin hood -->
    <ellipse cx="50" cy="24" rx="21" ry="19" fill="#1A1A2E"/>
    <path d="M29 24 Q29 44 33 54 L50 49 L67 54 Q71 44 71 24 Z" fill="#1A1A2E"/>
    <!-- Visible lower face -->
    <ellipse cx="50" cy="36" rx="13" ry="9" fill="#D4A574"/>
    <!-- Mask covering upper face -->
    <rect x="37" y="24" width="26" height="14" rx="3" fill="#0D0D1E"/>
    <!-- Glowing eyes through mask -->
    <ellipse cx="44" cy="30" rx="3" ry="2" fill="#CC0066"/>
    <ellipse cx="56" cy="30" rx="3" ry="2" fill="#CC0066"/>
    <circle cx="44" cy="30" r="1.2" fill="#FF44AA" opacity="0.9"/>
    <circle cx="56" cy="30" r="1.2" fill="#FF44AA" opacity="0.9"/>
    <!-- Lips -->
    <path d="M45 40 Q50 43 55 40" stroke="#8B0030" stroke-width="1.5" fill="#C04070"/>
    <!-- Hair strands -->
    <path d="M29 24 Q20 38 22 55" stroke="#1A0A0A" stroke-width="5" fill="none" stroke-linecap="round"/>
    <!-- Tight leather bodysuit -->
    <path d="M27 53 Q50 48 73 53 L71 92 Q50 95 29 92 Z" fill="#1A1A2E"/>
    <!-- Suit details -->
    <path d="M38 55 Q50 52 62 55 L62 90 Q50 93 38 90 Z" fill="#2C2C3E" opacity="0.6"/>
    <line x1="50" y1="53" x2="50" y2="92" stroke="#CC0066" stroke-width="1" opacity="0.6"/>
    <!-- Belt -->
    <rect x="27" y="80" width="46" height="5" rx="2" fill="#3A1A2A"/>
    <!-- Arms -->
    <rect x="13" y="54" width="12" height="26" rx="4" fill="#1A1A2E"/>
    <rect x="75" y="54" width="12" height="26" rx="4" fill="#1A1A2E"/>
    <!-- Twin blades -->
    <rect x="5" y="42" width="2.5" height="26" rx="1" fill="#C0C0C0"/>
    <polygon points="5,42 7.5,42 6.25,34" fill="#E0E0E0"/>
    <rect x="88" y="42" width="2.5" height="26" rx="1" fill="#C0C0C0"/>
    <polygon points="88,42 90.5,42 89.25,34" fill="#E0E0E0"/>
    <!-- Legs -->
    <rect x="32" y="90" width="14" height="22" rx="3" fill="#1A1A2E"/>
    <rect x="54" y="90" width="14" height="22" rx="3" fill="#1A1A2E"/>
    <!-- Boots with heels -->
    <rect x="32" y="106" width="14" height="8" rx="2" fill="#0D0D1E"/>
    <rect x="54" y="106" width="14" height="8" rx="2" fill="#0D0D1E"/>
  </svg>`,

  // ===== PALADIN MALE =====
  'Paladin-male': `<svg viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg">
    <!-- Great helm - full plate -->
    <rect x="28" y="12" width="44" height="34" rx="5" fill="#C0C0C8"/>
    <!-- Visor slits -->
    <rect x="33" y="28" width="14" height="4" rx="2" fill="#1A1A2E"/>
    <rect x="53" y="28" width="14" height="4" rx="2" fill="#1A1A2E"/>
    <!-- Helmet top ridge -->
    <rect x="46" y="10" width="8" height="6" rx="2" fill="#D4AF37"/>
    <!-- Cross on helmet -->
    <rect x="47" y="14" width="6" height="16" rx="1" fill="#D4AF37"/>
    <rect x="43" y="20" width="14" height="4" rx="1" fill="#D4AF37"/>
    <!-- Neck gorget -->
    <rect x="38" y="44" width="24" height="10" rx="3" fill="#B0B0B8"/>
    <!-- Full plate chest -->
    <rect x="24" y="52" width="52" height="38" rx="4" fill="#C0C0C8"/>
    <!-- Plate highlights -->
    <rect x="27" y="55" width="46" height="32" rx="3" fill="#D0D0D8" opacity="0.5"/>
    <!-- Breastplate ridge -->
    <rect x="47" y="54" width="6" height="34" rx="2" fill="#B0B0B8"/>
    <!-- Holy cross emblem -->
    <rect x="47" y="58" width="6" height="20" rx="1" fill="#D4AF37"/>
    <rect x="41" y="64" width="18" height="6" rx="1" fill="#D4AF37"/>
    <!-- Divine glow -->
    <ellipse cx="50" cy="68" rx="14" ry="12" fill="#D4AF37" opacity="0.15"/>
    <!-- Shoulder pauldrons - large -->
    <ellipse cx="22" cy="55" rx="13" ry="9" fill="#B0B0B8" transform="rotate(-20,22,55)"/>
    <ellipse cx="78" cy="55" rx="13" ry="9" fill="#B0B0B8" transform="rotate(20,78,55)"/>
    <!-- Arm plate left + big shield -->
    <rect x="10" y="56" width="12" height="30" rx="3" fill="#B8B8C0"/>
    <rect x="2" y="50" width="14" height="38" rx="4" fill="#C0C0C8"/>
    <rect x="4" y="52" width="10" height="34" rx="3" fill="#D0D0D8" opacity="0.7"/>
    <!-- Cross on shield -->
    <rect x="8" y="56" width="3" height="22" rx="1" fill="#D4AF37"/>
    <rect x="4" y="64" width="11" height="5" rx="1" fill="#D4AF37"/>
    <!-- Right arm + holy sword -->
    <rect x="78" y="56" width="12" height="30" rx="3" fill="#B8B8C0"/>
    <rect x="90" y="35" width="5" height="50" rx="2" fill="#D4D4E0"/>
    <!-- Sword crossguard -->
    <rect x="84" y="52" width="17" height="5" rx="2" fill="#D4AF37"/>
    <!-- Sword glow -->
    <rect x="90" y="35" width="5" height="50" rx="2" fill="#FFFFFF" opacity="0.3"/>
    <!-- Leg plate -->
    <rect x="30" y="88" width="17" height="24" rx="3" fill="#B0B0B8"/>
    <rect x="53" y="88" width="17" height="24" rx="3" fill="#B0B0B8"/>
    <!-- Sabatons (foot armor) -->
    <ellipse cx="38" cy="113" rx="11" ry="5" fill="#A0A0A8"/>
    <ellipse cx="62" cy="113" rx="11" ry="5" fill="#A0A0A8"/>
  </svg>`,

  // ===== PALADIN FEMALE =====
  'Paladin-female': `<svg viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg">
    <!-- Winged helmet - feminine -->
    <ellipse cx="50" cy="24" rx="20" ry="17" fill="#C8C8D0"/>
    <rect x="30" y="28" width="40" height="10" rx="3" fill="#C8C8D0"/>
    <!-- Wings on helmet -->
    <path d="M30 24 Q16 18 14 30 Q22 28 30 32" fill="#D4AF37" opacity="0.9"/>
    <path d="M70 24 Q84 18 86 30 Q78 28 70 32" fill="#D4AF37" opacity="0.9"/>
    <!-- Face opening -->
    <ellipse cx="50" cy="32" rx="12" ry="10" fill="#E8C49A"/>
    <!-- Eyes - determined -->
    <ellipse cx="44" cy="30" rx="3" ry="2.5" fill="#1A3A6A"/>
    <ellipse cx="56" cy="30" rx="3" ry="2.5" fill="#1A3A6A"/>
    <!-- Lips -->
    <path d="M46 37 Q50 40 54 37" stroke="#8B3A3A" stroke-width="1.5" fill="#C06060"/>
    <!-- Holy light halo hint -->
    <ellipse cx="50" cy="20" rx="22" ry="6" fill="#D4AF37" opacity="0.2"/>
    <!-- Neck gorget -->
    <rect x="40" y="41" width="20" height="9" rx="3" fill="#B8B8C0"/>
    <!-- Plate armor - feminine cut -->
    <path d="M25 50 Q50 46 75 50 L75 88 Q50 92 25 88 Z" fill="#C8C8D0"/>
    <path d="M30 52 Q50 49 70 52 L70 75 Q50 78 30 75 Z" fill="#D8D8E0" opacity="0.6"/>
    <!-- Holy cross breastplate -->
    <rect x="47" y="54" width="6" height="22" rx="1" fill="#D4AF37"/>
    <rect x="40" y="62" width="20" height="6" rx="1" fill="#D4AF37"/>
    <!-- Divine glow effect -->
    <circle cx="50" cy="65" r="15" fill="#D4AF37" opacity="0.1"/>
    <!-- Shoulder pauldrons -->
    <ellipse cx="23" cy="53" rx="12" ry="7" fill="#B8B8C0" transform="rotate(-15,23,53)"/>
    <ellipse cx="77" cy="53" rx="12" ry="7" fill="#B8B8C0" transform="rotate(15,77,53)"/>
    <!-- Arms -->
    <rect x="12" y="52" width="11" height="28" rx="3" fill="#C0C0C8"/>
    <rect x="77" y="52" width="11" height="28" rx="3" fill="#C0C0C8"/>
    <!-- Shield - round with cross -->
    <circle cx="8" cy="68" r="13" fill="#C0C0C8"/>
    <circle cx="8" cy="68" r="10" fill="#D0D0D8" opacity="0.8"/>
    <rect x="5" y="58" width="5" height="20" rx="1.5" fill="#D4AF37"/>
    <rect x="1" y="65" width="14" height="5" rx="1.5" fill="#D4AF37"/>
    <!-- Holy sword -->
    <rect x="88" y="32" width="4" height="48" rx="2" fill="#D8D8E8"/>
    <rect x="82" y="48" width="16" height="4" rx="2" fill="#D4AF37"/>
    <rect x="88" y="32" width="4" height="48" rx="2" fill="white" opacity="0.4"/>
    <!-- Skirt armor -->
    <rect x="30" y="86" width="7" height="20" rx="3" fill="#B8B8C0"/>
    <rect x="39" y="86" width="7" height="22" rx="3" fill="#B8B8C0"/>
    <rect x="48" y="86" width="7" height="20" rx="3" fill="#B8B8C0"/>
    <rect x="57" y="86" width="7" height="22" rx="3" fill="#B8B8C0"/>
    <rect x="66" y="86" width="7" height="20" rx="3" fill="#B8B8C0"/>
    <!-- Leg armor -->
    <rect x="34" y="104" width="13" height="10" rx="3" fill="#B0B0B8"/>
    <rect x="53" y="104" width="13" height="10" rx="3" fill="#B0B0B8"/>
  </svg>`
};

// Fallback avatar
function getAvatar(charClass, gender) {
  const key = `${charClass}-${gender}`;
  return AVATARS[key] || AVATARS['Warrior-male'];
}
