// The house capture tool calls these real mouse actions from plan eval steps.
// Holding the physical button captures native :active, not a film-made patch.
export async function before(page) {
  await page.exposeFunction('capturePointer', async (action, selector) => {
    if (action === 'move') {
      const box = await page.$eval(selector, e => { const b = e.getBoundingClientRect(); return [b.x + b.width / 2, b.y + b.height / 2]; });
      await page.mouse.move(...box);
    } else if (action === 'down') await page.mouse.down();
    else if (action === 'up') await page.mouse.up();
    else if (action === 'clear') await page.mouse.move(0, 0);
    else throw Error('Unknown mouse action ' + action);
  });
}
