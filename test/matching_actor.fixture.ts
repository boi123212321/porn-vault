export default [
  [
    "jill kassidy swallowed",
    {
      name: "Kassidy",
      aliases: [],
    },
    false,
  ],
  [
    "jill kassidy swallowed",
    {
      name: "Jill Kassidy",
      aliases: [],
    },
    true,
  ],
  [
    "Jill Kassidy - Jill’s Oral Expertise - Swallowed",
    {
      name: "Jill Kassidy",
      aliases: [],
    },
    true,
  ],
  [
    "Jill Kassidy - Jill’s Oral Expertise - Swallowed",
    {
      name: "abcdef abc",
      aliases: ["regex:kassidy"],
    },
    true,
  ],
  [
    "Jill’s Oral Expertise - Swallowed",
    {
      name: "Jill",
      aliases: [],
    },
    false,
  ],
  [
    "Jill And Gina In A Sloppy Gargling Suck Party - Gina Valentina & Jill Kassidy - Swallowed",
    {
      name: "Gina Valentina",
      aliases: [],
    },
    true,
  ],
  [
    "Jill And Gina In A Sloppy Gargling Suck Party - Gina Valentina & Jill KaSSidy - Swallowed",
    {
      name: "Jill Kassidy",
      aliases: [],
    },
    true,
  ],
  [
    "Jill And Gina In A Sloppy Gargling Suck Party - gina Valentina&jill Kassidy - Swallowed",
    {
      name: "Gina Valentina",
      aliases: [],
    },
    true,
  ],
  [
    "Kali Rose - Scene",
    {
      name: "Kali Roses",
      aliases: ["Kali Rose"],
    },
    true,
  ],
  [
    "Kali Rose - Swallowed",
    {
      name: "Kali Roses",
      aliases: ["regex:(Kali.*Swallowed)|(Swallowed.*Kali)"],
    },
    true,
  ],
  [
    "Swallowed - Kali Rose",
    {
      name: "Kali Roses",
      aliases: ["regex:(Kali.*Swallowed)|(Swallowed.*Kali)"],
    },
    true,
  ],
  [
    "Swallowed - Kali Rose",
    {
      name: "Kali Roses",
      aliases: [],
    },
    false,
  ],
  [
    "Swallowed - Kali Rose",
    {
      name: "kali",
      aliases: [],
    },
    false,
  ],
  [
    "Jill.And.Gina.In.A.Sloppy.Gargling.Suck.Party.Gina.Valentina.&.Jill.Kassidy.Swallowed.mp4",
    {
      name: "Gina Valentina",
      aliases: [],
    },
    true,
  ],
  [
    "[jill kassidy] swallowed",
    {
      name: "Jill Kassidy",
      aliases: [],
    },
    true,
  ],
  [
    "[jill kassidy] swallowed",
    {
      name: "Test",
      aliases: ["jill"],
    },
    false,
  ],
] as [string, { name: string; aliases: string[] }, boolean][];
