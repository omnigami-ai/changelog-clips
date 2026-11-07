# Changelog clips · omnigami

Short clips that show what changed in your app.

Tell it what you shipped. It films the change in your real app as a short, looping clip on a calm paper ground, sized for your changelog, your docs and social posts, so people see the new thing working instead of reading about it.

Watch it play live, and change its words, at [omnigami.ai/skills/changelog-clips](https://omnigami.ai/skills/changelog-clips).

## Install

In Claude Code:

```
/plugin marketplace add omnigami-ai/skills
/plugin install omnigami-changelog-clips@omnigami
```

With the skills CLI, for Claude Code and other agents that read SKILL.md:

```bash
npx skills add omnigami-ai/changelog-clips
```

Or copy `skills/changelog-clips/` into your agent's skills folder (for Claude Code, `~/.claude/skills/changelog-clips/`). Then ask:

```
Make a changelog clip for the change we shipped in https://your-product.com. Show the real action and result, in web, square and portrait sizes.
```

## What it runs

The skill works on your computer. It runs the Node scripts in `skills/changelog-clips/scripts/`: they open your product's pages in a local headless browser to capture its real screens, then render the film with that browser and ffmpeg, writing MP4s and an editable HTML film to your project. It sends nothing to omnigami or anyone else, and uses no network beyond loading your own product's pages and the fonts and assets in this folder.

## You need

- An AI coding agent that reads SKILL.md
- Node 20 or later
- ffmpeg
- Chrome, Chromium, Edge or Brave
- puppeteer-core

None beyond your coding agent’s usage. Node, ffmpeg and the browser are free.

## Licence

Free to use. Use the films and anything else the skill makes for anything, commercial work included. Don't redistribute the skill. See [LICENSE.md](LICENSE.md). The bundled fonts keep their own licence (SIL Open Font License, beside them in `reference/assets/fonts/`).

## Credits

Style inspired by Notion’s release-notes videos (https://www.notion.com/releases); Notion didn’t make or endorse this skill. Its example shows Ostlery, a fictional company made for omnigami’s examples, with sample data.

omnigami is not affiliated with Anthropic. More skills at [omnigami.ai](https://omnigami.ai).
