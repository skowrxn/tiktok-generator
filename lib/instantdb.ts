import { id, i, init, InstaQLEntity } from "@instantdb/react";

const APP_ID = process.env.NEXT_PUBLIC_INSTANTDB_APP_ID || "";

const schema = i.schema({
  entities: {
    images: i.entity({
      name: i.string(),
      url: i.string(),
      createdAt: i.number(),
    }),
    music: i.entity({
      name: i.string(),
      url: i.string(),
      createdAt: i.number(),
    }),
    texts: i.entity({
      content: i.string(),
      createdAt: i.number(),
    }),
    emojis: i.entity({
      emoji: i.string(),
      createdAt: i.number(),
    }),
  },
});

export const db = init({ appId: APP_ID, schema });

export type ImageAsset = InstaQLEntity<typeof schema, "images">;
export type MusicAsset = InstaQLEntity<typeof schema, "music">;
export type TextAsset = InstaQLEntity<typeof schema, "texts">;
export type EmojiAsset = InstaQLEntity<typeof schema, "emojis">;

export { id };
