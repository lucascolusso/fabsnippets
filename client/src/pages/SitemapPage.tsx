import { useState, useEffect } from 'react';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import { ArrowRight, Download, ExternalLink, Eye, FileJson, FileText } from 'lucide-react';

export function SitemapPage() {
  const [sitemapData, setSitemapData] = useState<{ url: string; lastmod?: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Function to fetch and parse sitemap XML
    const fetchSitemap = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/sitemap.xml');
        const xmlText = await response.text();
        
        // Parse XML
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
        const urlElements = xmlDoc.getElementsByTagName('url');
        
        const urls = Array.from(urlElements).map(urlElement => {
          const loc = urlElement.getElementsByTagName('loc')[0]?.textContent || '';
          const lastmod = urlElement.getElementsByTagName('lastmod')[0]?.textContent;
          
          return { url: loc, lastmod };
        });
        
        setSitemapData(urls);
      } catch (error) {
        console.error('Error fetching sitemap:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchSitemap();
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <Breadcrumb className="mb-6">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink as={Link} href="/">Home</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink>Sitemap</BreadcrumbLink>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Sitemap</CardTitle>
            <CardDescription>
              A sitemap helps search engines understand the structure of your website and improve visibility in search results.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 mb-6">
              <a href="/sitemap.xml" target="_blank" rel="noopener noreferrer">
                <Button variant="outline" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  View XML Sitemap
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </a>
              <a href="/sitemap.xml" download="fabsnippets-sitemap.xml">
                <Button variant="outline" className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Download Sitemap
                </Button>
              </a>
            </div>

            <div className="border rounded-md">
              <div className="bg-muted px-4 py-2 border-b font-medium text-sm flex justify-between">
                <span>URL</span>
                <span>Last Modified</span>
              </div>
              <div className="divide-y max-h-[500px] overflow-y-auto">
                {isLoading ? (
                  <div className="p-4 text-center text-muted-foreground">Loading sitemap data...</div>
                ) : (
                  sitemapData.map((item, index) => (
                    <div key={index} className="flex justify-between px-4 py-3 hover:bg-muted/50 text-sm">
                      <a 
                        href={item.url} 
                        className="text-primary hover:underline flex items-center gap-1"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {item.url.replace(/^https?:\/\/[^/]+/, '')}
                        <ExternalLink className="h-3 w-3 inline" />
                      </a>
                      <span className="text-muted-foreground">
                        {item.lastmod ? new Date(item.lastmod).toLocaleDateString() : "N/A"}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Visual Sitemap</CardTitle>
            <CardDescription>
              A hierarchical view of the site structure for easier navigation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-md p-4">
              <div className="flex flex-col space-y-3">
                <div className="flex items-center">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold">H</div>
                  <ArrowRight className="mx-2 text-muted-foreground" />
                  <Link to="/" className="text-primary hover:underline">Home Page</Link>
                </div>
                
                <div className="ml-10 space-y-3 border-l pl-6">
                  <div className="flex items-center">
                    <div className="w-6 h-6 rounded-full bg-primary/80 flex items-center justify-center text-primary-foreground font-bold text-xs">L</div>
                    <ArrowRight className="mx-2 text-muted-foreground" />
                    <Link to="/leaderboard" className="text-primary hover:underline">Leaderboard Page</Link>
                  </div>
                  
                  <div className="flex items-center">
                    <div className="w-6 h-6 rounded-full bg-primary/80 flex items-center justify-center text-primary-foreground font-bold text-xs">A</div>
                    <ArrowRight className="mx-2 text-muted-foreground" />
                    <Link to="/auth" className="text-primary hover:underline">Authentication Page</Link>
                  </div>
                  
                  <div className="flex items-center">
                    <div className="w-6 h-6 rounded-full bg-primary/80 flex items-center justify-center text-primary-foreground font-bold text-xs">P</div>
                    <ArrowRight className="mx-2 text-muted-foreground" />
                    <span className="text-muted-foreground">User Profiles</span>
                    <span className="ml-2 text-xs text-muted-foreground">(Dynamic)</span>
                  </div>
                  
                  <div className="flex items-center">
                    <div className="w-6 h-6 rounded-full bg-primary/80 flex items-center justify-center text-primary-foreground font-bold text-xs">S</div>
                    <ArrowRight className="mx-2 text-muted-foreground" />
                    <span className="text-muted-foreground">Snippet Pages</span>
                    <span className="ml-2 text-xs text-muted-foreground">(Dynamic)</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}