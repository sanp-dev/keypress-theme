export function rehypeOptimizeContentImages() {
  return (tree) => {
    function walk(node) {
      if (node.children) {
        for (let i = 0; i < node.children.length; i++) {
          const child = node.children[i];
          if (child.type === 'element' && child.tagName === 'img') {
            const classes = child.properties?.className || [];
            const isImd = Array.isArray(classes) 
              ? classes.includes('imd') 
              : (typeof classes === 'string' && classes.split(' ').includes('imd'));
            
            if (isImd && !child.properties?.__optimized) {
              const src = child.properties.src;
              if (src && src.includes('images.readshayari.in')) {
                // Clean the URL if it already has cdn-cgi path
                const cleanPattern = /(https?:\/\/images\.readshayari\.in)\/cdn-cgi\/image\/[^\/]+\/(.+)/;
                let cleanUrl = src;
                const match = src.match(cleanPattern);
                if (match) {
                  cleanUrl = `${match[1]}/${match[2]}`;
                }

                const path = cleanUrl.replace(/^https?:\/\/images\.readshayari\.in\//, '');
                const baseUrl = 'https://images.readshayari.in';

                const desktop1x = `${baseUrl}/cdn-cgi/image/format=auto,width=320,quality=75/${path}`;
                const desktop2x = `${baseUrl}/cdn-cgi/image/format=auto,width=640,quality=75/${path}`;
                const mobile1x = `${baseUrl}/cdn-cgi/image/format=auto,width=480,quality=75/${path}`;
                const mobile2x = `${baseUrl}/cdn-cgi/image/format=auto,width=960,quality=75/${path}`;
                const fallback = `${baseUrl}/cdn-cgi/image/format=auto,width=640,quality=75/${path}`;

                // Mark as optimized
                child.properties.__optimized = true;
                // Update fallback src
                child.properties.src = fallback;

                // Construct picture element
                const pictureNode = {
                  type: 'element',
                  tagName: 'picture',
                  properties: {},
                  children: [
                    {
                      type: 'element',
                      tagName: 'source',
                      properties: {
                        media: '(min-width: 769px)',
                        srcset: `${desktop1x} 1x, ${desktop2x} 2x`
                      },
                      children: []
                    },
                    {
                      type: 'element',
                      tagName: 'source',
                      properties: {
                        media: '(max-width: 768px)',
                        srcset: `${mobile1x} 1x, ${mobile2x} 2x`
                      },
                      children: []
                    },
                    child
                  ]
                };

                // Replace the child with the picture element
                node.children[i] = pictureNode;
              }
            }
          } else {
            walk(child);
          }
        }
      }
    }
    walk(tree);
  };
}
