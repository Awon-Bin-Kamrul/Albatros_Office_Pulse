type DiscordCommandOption = {
  type: number;
  name: string;
  description: string;
  required?: boolean;
  choices?: Array<{ name: string; value: string }>;
};

type DiscordCommand = {
  name: string;
  description: string;
  type: number;
  options?: DiscordCommandOption[];
};

export {};

const applicationId = process.env.DISCORD_APPLICATION_ID;
const botToken = process.env.DISCORD_BOT_TOKEN;
const guildId = process.env.DISCORD_GUILD_ID;

if (!applicationId || !botToken) {
  console.error("Missing DISCORD_APPLICATION_ID or DISCORD_BOT_TOKEN.");
  process.exit(1);
}

const commands: DiscordCommand[] = [
  {
    name: "status",
    description: "Show the current device status for all office rooms.",
    type: 1,
  },
  {
    name: "room",
    description: "Show the current device status for one room.",
    type: 1,
    options: [
      {
        type: 3,
        name: "name",
        description: "Choose the room to inspect.",
        required: true,
        choices: [
          { name: "Drawing Room", value: "drawing_room" },
          { name: "Work Room 1", value: "work_room_1" },
          { name: "Work Room 2", value: "work_room_2" },
        ],
      },
    ],
  },
  {
    name: "usage",
    description: "Show the current power usage summary.",
    type: 1,
  },
];

const endpoint = guildId
  ? `https://discord.com/api/v10/applications/${applicationId}/guilds/${guildId}/commands`
  : `https://discord.com/api/v10/applications/${applicationId}/commands`;

const response = await fetch(endpoint, {
  method: "PUT",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bot ${botToken}`,
  },
  body: JSON.stringify(commands),
});

if (!response.ok) {
  console.error(`Failed to register commands: ${response.status} ${response.statusText}`);
  console.error(await response.text());
  process.exit(1);
}

const registered = (await response.json()) as Array<{ name: string }>;
console.log(`Registered ${registered.length} Discord commands${guildId ? ` for guild ${guildId}` : ""}.`);
for (const command of registered) {
  console.log(`- /${command.name}`);
}