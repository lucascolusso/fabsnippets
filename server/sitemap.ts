import { db } from "@db";
import { snippets, users } from "@db/schema";
import { eq } from "drizzle-orm";

interface SitemapUrl {
  loc: string;
  lastmod?: string;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
}

/**
 * Generate the sitemap XML content
 * @param baseUrl The base URL of the website (e.g., https://example.com)
 * @returns XML string of the sitemap
 */
export async function generateSitemap(baseUrl: string): Promise<string> {
  // Ensure baseUrl doesn't end with a slash
  baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  
  // Collection of URLs to include in sitemap
  const urls: SitemapUrl[] = [];
  
  // Add static pages
  urls.push(
    { loc: `${baseUrl}/`, changefreq: 'daily', priority: 1.0 },
    { loc: `${baseUrl}/leaderboard`, changefreq: 'daily', priority: 0.9 },
    { loc: `${baseUrl}/auth`, changefreq: 'monthly', priority: 0.5 }
  );
  
  // Add dynamic snippet pages
  try {
    const allSnippets = await db.select({
      id: snippets.id,
      updatedAt: snippets.updatedAt
    }).from(snippets);
    
    for (const snippet of allSnippets) {
      const lastmod = snippet.updatedAt 
        ? new Date(snippet.updatedAt).toISOString()
        : undefined;
      
      urls.push({
        loc: `${baseUrl}/snippet/${snippet.id}`,
        lastmod,
        changefreq: 'monthly',
        priority: 0.8
      });
    }
  } catch (error) {
    console.error('Error fetching snippets for sitemap:', error);
  }
  
  // Add user profile pages
  try {
    const allUsers = await db.select({
      username: users.username,
      createdAt: users.createdAt
    }).from(users);
    
    for (const user of allUsers) {
      const lastmod = user.createdAt 
        ? new Date(user.createdAt).toISOString()
        : undefined;
      
      urls.push({
        loc: `${baseUrl}/profile/${user.username}`,
        lastmod,
        changefreq: 'weekly',
        priority: 0.7
      });
    }
  } catch (error) {
    console.error('Error fetching users for sitemap:', error);
  }
  
  // Start building XML
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  
  // Add each URL to the XML
  for (const url of urls) {
    xml += '  <url>\n';
    xml += `    <loc>${url.loc}</loc>\n`;
    
    if (url.lastmod) {
      xml += `    <lastmod>${url.lastmod}</lastmod>\n`;
    }
    
    if (url.changefreq) {
      xml += `    <changefreq>${url.changefreq}</changefreq>\n`;
    }
    
    if (url.priority !== undefined) {
      xml += `    <priority>${url.priority.toFixed(1)}</priority>\n`;
    }
    
    xml += '  </url>\n';
  }
  
  xml += '</urlset>';
  
  return xml;
}