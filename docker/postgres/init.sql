-- Init SQL for NextGame: create table and insert games from db.json
CREATE TABLE IF NOT EXISTS games (
  id INTEGER PRIMARY KEY,
  name TEXT,
  genre TEXT,
  difficulty TEXT,
  mood TEXT,
  description TEXT,
  image TEXT,
  keywords JSONB
);

TRUNCATE TABLE games;

INSERT INTO games (id, name, genre, difficulty, mood, description, image, keywords) VALUES
(1,'The Witcher 3','RPG','alta','imersivo','RPG com narrativa profunda, mundo aberto e escolhas morais.','/images/The Witcher 3.jpeg','["história","explorar","imersivo","historia"]'::jsonb),
(2,'Stardew Valley','Simulação','baixa','relaxante','Simulador de fazenda calmo, ótimo para relaxar e jogar devagar.','/images/Stardew Valley.jpeg','["relax","calmo","simples","tranquilo"]'::jsonb),
(3,'Dark Souls','Ação','muito alta','desafiador','Jogo de ação desafiador com combate exigente e atmosferas sombrias.','/images/Darksouls.png','["desafio","difícil","dificil","boss"]'::jsonb),
(4,'Minecraft','Criativo','média','livre','Construção e exploração em um mundo aberto e sandbox.','/images/Minecraft.png','["construir","criativo","explorar","sandbox"]'::jsonb),
(5,'Hollow Knight','Plataforma','alta','sombrio','Exploração em plataforma com atmosfera sombria e combate técnico.','/images/Hollow Knight.png','["sombrio","explorar","plataforma","metroidvania"]'::jsonb),
(6,'Celeste','Plataforma','alta','emocional','Plataforma focada em precisão e uma história emocional sobre superação.','/images/Celeste.jpeg','["precisão","desafio","história","platformer"]'::jsonb),
(7,'Overwatch 2','FPS','média','competitivo','Jogo de tiro em equipe com heróis e papéis distintos.','/images/Overwatch 2.jpeg','["multiplayer","competitivo","equipe","heróis"]'::jsonb),
(8,'Portal 2','Puzzle','média','inteligente','Quebra-cabeças espaciais com humor e cooperação opcional.','/images/Portal 2.jpeg','["puzzle","humor","criativo","coop"]'::jsonb),
(9,'Civilization VI','Estratégia','média','estratégico','Jogo de estratégia por turnos focado em construir uma civilização ao longo dos séculos.','/images/Civilization VI.jpeg','["estratégia","turnos","construção","complexo"]'::jsonb),
(10,'Hades','Roguelike','média','dinâmico','Roguelike de ação com narrativa progressiva e combate fluido.','/images/Hades.jpeg','["roguelike","repetível","combate","história"]'::jsonb),
(11,'The Sims 4','Simulação','baixa','criativo','Simulador social para criar e controlar vidas virtuais.','/images/The Sims 4.jpeg','["criar","social","simulação","customizar"]'::jsonb),
(12,'Among Us','Social','baixa','divertido','Jogo social de dedução com grupo de jogadores e impostores.','/images/Among Us.jpeg','["social","dedução","multiplayer","party"]'::jsonb),
(13,'Rocket League','Esportivo','média','rápido','Futebol com carros — partidas rápidas e competitivas.','/images/Rocket League.jpeg','["competitivo","rápido","multiplayer","esportivo"]'::jsonb),
(14,'Persona 5 Royal','RPG','média','estiloso','JRPG com forte narrativa, personagens memoráveis e mecânicas de turno.','/images/Persona 5 Royal.jpeg','["história","personagens","turnos","JRPG"]'::jsonb),
(15,'Doom Eternal','FPS','alta','adrenalina','FPS frenético com combate rápido e movimento agressivo.','/images/Doom Eternal.jpg','["rápido","ação","adrenalina","combate"]'::jsonb),
(16,'Animal Crossing: New Horizons','Simulação','baixa','relaxante','Jogo calmo de socialização, criação e personalização em uma ilha.','/images/Animal Crossing New Horizons.jpeg','["relaxante","social","personalização","calmo"]'::jsonb),
(17,'Sekiro: Shadows Die Twice','Ação','muito alta','desafiador','Ação com enfoque em parry e precisão, combate punitivo e ritmo rápido.','/images/Sekiro Shadows Die Twice.jpeg','["parry","difícil","desafio","ação"]'::jsonb),
(18,'Disco Elysium','RPG','média','intelectual','RPG focado em narrativa e escolhas, com sistema profundo de habilidades.','/images/Disco Elysium.jpeg','["narrativa","diálogos","decisões","investigação"]'::jsonb),
(19,'Baldur''s Gate 3','RPG','média','épico','RPG baseado em D&D com combate por turnos e escolhas de história.','/images/Baldur''s Gate 3.jpeg','["D&D","turnos","história","party"]'::jsonb),
(20,'Apex Legends','Battle Royale','média','competitivo','Battle royale em equipe com heróis e habilidades únicas.','/images/Apex Legends.jpeg','["battle royale","multiplayer","competitivo","equipe"]'::jsonb)
;

-- End of init.sql
