export function remarkStripHeroDuplicate() {
  return (tree) => {
    let guard = 0;
    while (guard < 3) {
      const first = tree.children[0];
      if (!first) break;

      if (first.type === 'heading' && first.depth === 1) {
        tree.children.shift();
        guard++;
        continue;
      }

      const isImgPara = first.type === 'paragraph'
        && first.children?.length === 1
        && first.children[0].type === 'image';
      const isHtmlImg = first.type === 'html'
        && /^\s*<(picture|img|figure)[\s>]/i.test(first.value || '');

      if (isImgPara || isHtmlImg) {
        tree.children.shift();
        guard++;
        continue;
      }

      break;
    }
  };
}