export type Craft = {
  id?: string | number;
  name?: string;
  source?: string;
  type?: string;
  url?: string;
  SPELL_ID?: number | string;
  SPELL_URL?: string;
  spellUrl?: string; // alias toléré
};

export type Character = {
  shareId?: string;
  name: string;
  server: string;
  level?: number;
  race?: string;
  class?: string;
  guild?: string;
  faction?: "alliance" | "horde";
  profession1?: string;
  profession2?: string;
  professionLevels?: Record<string, number>;
  crafts: Record<string, Craft[]>;
};

export type CharacterDoc = Character & {
  crafts: Record<string, Craft[]>;
};
