export default (req, res) => {
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    '  <url>',
    '    <loc>https://trackfocus.vercel.app/</loc>',
    '    <lastmod>2026-06-25</lastmod>',
    '    <changefreq>weekly</changefreq>',
    '    <priority>1.0</priority>',
    '  </url>',
    '  <url>',
    '    <loc>https://trackfocus.vercel.app/about-ariven.html</loc>',
    '    <lastmod>2026-06-25</lastmod>',
    '    <changefreq>monthly</changefreq>',
    '    <priority>0.8</priority>',
    '  </url>',
    '  <url>',
    '    <loc>https://trackfocus.vercel.app/privacy.html</loc>',
    '    <lastmod>2026-06-25</lastmod>',
    '    <changefreq>monthly</changefreq>',
    '    <priority>0.5</priority>',
    '  </url>',
    '  <url>',
    '    <loc>https://trackfocus.vercel.app/terms.html</loc>',
    '    <lastmod>2026-06-25</lastmod>',
    '    <changefreq>monthly</changefreq>',
    '    <priority>0.5</priority>',
    '  </url>',
    '  <url>',
    '    <loc>https://trackfocus.vercel.app/data-transparency.html</loc>',
    '    <lastmod>2026-06-25</lastmod>',
    '    <changefreq>monthly</changefreq>',
    '    <priority>0.5</priority>',
    '  </url>',
    '</urlset>',
  ].join('\n');

  res.setHeader('Content-Type', 'text/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.status(200).send(xml);
};
