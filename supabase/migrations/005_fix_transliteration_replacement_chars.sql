-- Fix corrupted U+FFFD (replacement character) in transliteration column.
-- These were caused by encoding corruption in the upstream dataset where
-- Tamil-specific phoneme characters (retroflex r ṟ, vowel markers) were
-- stored in a non-UTF-8 encoding and got mangled on import.

UPDATE kurals SET transliteration = replace(transliteration, 'Vaanuraiyum',    'Vaanuraiyum')   WHERE id = 50;  -- no-op, already fixed below
UPDATE kurals SET transliteration = 'Vaiyaththul Vaazhvaangu Vaazhpavan Vaanuraiyum
Theyvaththul Vaikkap Patum'
WHERE id = 50;

UPDATE kurals SET transliteration = 'Azhukkaaru Utaiyaarkku Adhusaalum Onnaar
Vazhukkaayum Keteen Padhu'
WHERE id = 165;

UPDATE kurals SET transliteration = 'Alavariindhu Vaazhaadhaan Vaazhkkai Ulapola
Illaakith Thondraak Ketum'
WHERE id = 479;

UPDATE kurals SET transliteration = 'Oliththakkaal Ennaam Uvari Elippakai
Naakam Uyirppak Ketum'
WHERE id = 763;

UPDATE kurals SET transliteration = 'Therinum Theraa Vitinum Azhivinkan
Theraan Pakaaan Vital'
WHERE id = 876;

UPDATE kurals SET transliteration = 'Izhaththoruum Kaadhalikkum Soodhepol Thunpam
Uzhaththoruum Kaadhatru Uyir'
WHERE id = 940;

UPDATE kurals SET transliteration = 'Ottaarpin Sendroruvan Vaazhdhalin Annilaiye
Kettaan Enappatudhal Nandru'
WHERE id = 967;

UPDATE kurals SET transliteration = 'Alarezha Aaruyir Nirkum Adhanaip
Palarariyaar Paakkiyath Thaal'
WHERE id = 1141;

UPDATE kurals SET transliteration = 'Vaazhvaarkku Vaanam Payandhatraal Veezhvaarkku
Veezhvaar Ali Kkum Ali'
WHERE id = 1192;
