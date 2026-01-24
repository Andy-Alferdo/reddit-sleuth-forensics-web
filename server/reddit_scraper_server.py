"""
Reddit Sock Puppet Scraper Server
=================================
A Flask server using Selenium and BeautifulSoup to scrape Reddit data
without requiring API keys. Mimics real browser behavior with enhanced
anti-blocking mechanisms.

Usage:
    python server/reddit_scraper_server.py

Endpoints:
    POST /scrape - Scrape Reddit data based on type (user, community, search)

Requirements:
    pip install selenium beautifulsoup4 flask flask-cors webdriver-manager fake-useragent lxml
"""

import os
import time
import random
import logging
from datetime import datetime
from typing import Optional, Dict, List, Any
from flask import Flask, request, jsonify
from flask_cors import CORS

from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException
from webdriver_manager.chrome import ChromeDriverManager
from bs4 import BeautifulSoup
from fake_useragent import UserAgent

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app, origins=["http://localhost:*", "http://127.0.0.1:*", "https://*.lovable.app"])


class RedditScraper:
    """
    Selenium-based Reddit scraper that mimics real browser behavior.
    Uses old.reddit.com for easier HTML parsing with enhanced anti-blocking.
    """
    
    def __init__(self):
        self.driver: Optional[webdriver.Chrome] = None
        self.ua = UserAgent()
        self.request_count = 0
        self.max_requests_before_rotation = 50  # Rotate session every 50 requests
        self._setup_driver()
    
    def _get_random_user_agent(self) -> str:
        """Get a random user agent string."""
        user_agents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',
        ]
        return random.choice(user_agents)
    
    def _get_random_viewport(self) -> tuple:
        """Get random viewport size to avoid fingerprinting."""
        viewports = [
            (1366, 768),
            (1440, 900),
            (1536, 864),
            (1920, 1080),
            (1280, 720),
            (1600, 900),
        ]
        return random.choice(viewports)
    
    def _setup_driver(self):
        """Configure and initialize the Chrome WebDriver with enhanced anti-detection measures."""
        options = Options()
        
        # Get random viewport
        width, height = self._get_random_viewport()
        
        # Run in headless mode
        options.add_argument('--headless=new')
        options.add_argument('--no-sandbox')
        options.add_argument('--disable-dev-shm-usage')
        options.add_argument('--disable-gpu')
        options.add_argument(f'--window-size={width},{height}')
        
        # Anti-detection measures
        options.add_argument(f'--user-agent={self._get_random_user_agent()}')
        options.add_argument('--disable-blink-features=AutomationControlled')
        options.add_experimental_option("excludeSwitches", ["enable-automation"])
        options.add_experimental_option('useAutomationExtension', False)
        
        # Additional stealth options
        options.add_argument('--disable-infobars')
        options.add_argument('--disable-extensions')
        options.add_argument('--disable-popup-blocking')
        options.add_argument('--ignore-certificate-errors')
        
        # Enhanced anti-detection options
        options.add_argument('--disable-web-security')
        options.add_argument('--allow-running-insecure-content')
        options.add_argument('--disable-features=IsolateOrigins,site-per-process')
        options.add_argument('--lang=en-US,en')
        options.add_argument('--start-maximized')
        
        # Proxy support (optional)
        proxy = os.environ.get('SCRAPER_PROXY')
        if proxy:
            options.add_argument(f'--proxy-server={proxy}')
            logger.info(f"Using proxy: {proxy}")
        
        try:
            service = Service(ChromeDriverManager().install())
            self.driver = webdriver.Chrome(service=service, options=options)
            
            # Execute stealth scripts
            self.driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
            self.driver.execute_script("Object.defineProperty(navigator, 'plugins', {get: () => [1, 2, 3, 4, 5]})")
            self.driver.execute_script("Object.defineProperty(navigator, 'languages', {get: () => ['en-US', 'en']})")
            
            logger.info("Chrome WebDriver initialized successfully with enhanced anti-detection")
        except Exception as e:
            logger.error(f"Failed to initialize WebDriver: {e}")
            raise
    
    def _rotate_session(self):
        """Rotate browser session to avoid fingerprinting."""
        logger.info("Rotating browser session...")
        if self.driver:
            try:
                self.driver.quit()
            except:
                pass
        self._setup_driver()
        self.request_count = 0
        logger.info("Browser session rotated successfully")
    
    def _check_rotation_needed(self):
        """Check if session rotation is needed."""
        self.request_count += 1
        if self.request_count >= self.max_requests_before_rotation:
            self._rotate_session()
    
    def _clear_cookies(self):
        """Clear cookies periodically."""
        if self.driver:
            try:
                self.driver.delete_all_cookies()
                logger.debug("Cookies cleared")
            except:
                pass
    
    def _accept_reddit_cookies(self):
        """Accept Reddit's cookie consent if present."""
        try:
            cookie_btn = self.driver.find_element(By.XPATH, "//button[contains(text(), 'Accept')]")
            cookie_btn.click()
            time.sleep(0.5)
        except:
            pass
    
    def _simulate_human_behavior(self):
        """Simulate random mouse movements and scrolls."""
        try:
            # Random scroll
            scroll_amount = random.randint(100, 500)
            self.driver.execute_script(f"window.scrollBy(0, {scroll_amount})")
            time.sleep(random.uniform(0.3, 1.0))
            
            # Sometimes scroll back up a bit
            if random.random() > 0.7:
                scroll_back = random.randint(50, 150)
                self.driver.execute_script(f"window.scrollBy(0, -{scroll_back})")
                time.sleep(random.uniform(0.2, 0.5))
        except:
            pass
    
    def _random_delay(self, min_seconds: float = 2.0, max_seconds: float = 6.0):
        """Add random delay between requests to avoid detection (increased delays)."""
        delay = random.uniform(min_seconds, max_seconds)
        time.sleep(delay)
    
    def _is_blocked(self, soup: BeautifulSoup) -> bool:
        """Check if Reddit blocked us."""
        if not soup:
            return True
        
        blocked_indicators = [
            'too many requests',
            'rate limit',
            'access denied',
            'captcha',
            'you broke reddit',
            'our cdn was unable',
            'request blocked'
        ]
        page_text = soup.get_text().lower()
        return any(indicator in page_text for indicator in blocked_indicators)
    
    def _get_page_with_retry(self, url: str, max_retries: int = 3) -> Optional[BeautifulSoup]:
        """Fetch page with retry logic and exponential backoff."""
        for attempt in range(max_retries):
            soup = self._get_page(url)
            if soup and not self._is_blocked(soup):
                return soup
            
            # Exponential backoff
            wait_time = (2 ** attempt) * random.uniform(3, 6)
            logger.warning(f"Retry {attempt + 1}/{max_retries}, waiting {wait_time:.1f}s")
            time.sleep(wait_time)
            
            # Rotate session on retry
            if attempt > 0:
                self._rotate_session()
                self._clear_cookies()
        
        return None
    
    def _get_page(self, url: str) -> Optional[BeautifulSoup]:
        """Fetch a page and return parsed BeautifulSoup object."""
        try:
            self._check_rotation_needed()
            self._random_delay(2.0, 5.0)
            
            # Occasionally simulate human behavior before navigation
            if random.random() > 0.6:
                self._simulate_human_behavior()
            
            self.driver.get(url)
            
            # Wait for page to load
            WebDriverWait(self.driver, 15).until(
                lambda d: d.execute_script('return document.readyState') == 'complete'
            )
            
            # Accept cookies if prompted
            self._accept_reddit_cookies()
            
            # Simulate reading the page
            if random.random() > 0.5:
                self._simulate_human_behavior()
            
            return BeautifulSoup(self.driver.page_source, 'lxml')
        except Exception as e:
            logger.error(f"Error fetching page {url}: {e}")
            return None
    
    def _parse_timestamp(self, time_element) -> int:
        """Parse timestamp from Reddit's time element."""
        if not time_element:
            return int(datetime.now().timestamp())
        
        # Try to get datetime attribute
        datetime_str = time_element.get('datetime') or time_element.get('title')
        if datetime_str:
            try:
                # Parse ISO format datetime
                dt = datetime.fromisoformat(datetime_str.replace('Z', '+00:00'))
                return int(dt.timestamp())
            except:
                pass
        
        # Fallback to current time
        return int(datetime.now().timestamp())
    
    def scrape_user_profile(self, username: str) -> Dict[str, Any]:
        """
        Scrape user profile information from Reddit.
        
        Args:
            username: Reddit username (without u/ prefix)
            
        Returns:
            Dict containing user profile data
        """
        url = f"https://old.reddit.com/user/{username}"
        logger.info(f"Scraping user profile: {username}")
        
        soup = self._get_page_with_retry(url)
        if not soup:
            return {'error': 'not_found', 'message': f'User "{username}" not found or page unavailable'}
        
        # Check if user exists
        if soup.select_one('.error') or 'page not found' in soup.text.lower():
            return {'error': 'not_found', 'message': f'User "{username}" not found on Reddit'}
        
        try:
            # Extract karma info from sidebar
            karma_element = soup.select_one('.karma')
            karma_breakdown = soup.select('.karma-breakdown td.karma')
            
            link_karma = 0
            comment_karma = 0
            
            if karma_breakdown and len(karma_breakdown) >= 2:
                try:
                    link_karma = int(karma_breakdown[0].text.strip().replace(',', ''))
                    comment_karma = int(karma_breakdown[1].text.strip().replace(',', ''))
                except:
                    pass
            elif karma_element:
                try:
                    total_karma = int(karma_element.text.strip().replace(',', ''))
                    link_karma = total_karma // 2
                    comment_karma = total_karma - link_karma
                except:
                    pass
            
            # Extract account age
            age_element = soup.select_one('.age time')
            created_utc = self._parse_timestamp(age_element)
            
            return {
                'name': username,
                'link_karma': link_karma,
                'comment_karma': comment_karma,
                'created_utc': created_utc
            }
        except Exception as e:
            logger.error(f"Error parsing user profile: {e}")
            return {'error': 'parse_error', 'message': str(e)}
    
    def scrape_user_posts(self, username: str, limit: int = 100) -> List[Dict[str, Any]]:
        """
        Scrape user's submitted posts.
        
        Args:
            username: Reddit username
            limit: Maximum number of posts to fetch
            
        Returns:
            List of post dictionaries
        """
        posts = []
        url = f"https://old.reddit.com/user/{username}/submitted"
        logger.info(f"Scraping posts for user: {username}")
        
        page_count = 0
        max_pages = 5  # Limit pagination
        
        while len(posts) < limit and page_count < max_pages:
            soup = self._get_page_with_retry(url)
            if not soup:
                break
            
            things = soup.select('.thing.link')
            if not things:
                break
            
            for thing in things:
                if len(posts) >= limit:
                    break
                
                try:
                    title_elem = thing.select_one('a.title')
                    time_elem = thing.select_one('time')
                    selftext_elem = thing.select_one('.md')
                    
                    post = {
                        'title': title_elem.text.strip() if title_elem else '',
                        'selftext': selftext_elem.text.strip() if selftext_elem else '',
                        'subreddit': thing.get('data-subreddit', ''),
                        'created_utc': self._parse_timestamp(time_elem),
                        'score': int(thing.get('data-score', 0)),
                        'num_comments': int(thing.get('data-comments-count', 0)),
                        'url': thing.get('data-url', ''),
                        'permalink': thing.get('data-permalink', ''),
                        'author': username
                    }
                    posts.append(post)
                except Exception as e:
                    logger.warning(f"Error parsing post: {e}")
                    continue
            
            # Check for next page
            next_btn = soup.select_one('.next-button a')
            if next_btn and next_btn.get('href'):
                url = next_btn['href']
                page_count += 1
            else:
                break
        
        logger.info(f"Scraped {len(posts)} posts for {username}")
        return posts[:limit]
    
    def scrape_user_comments(self, username: str, limit: int = 100) -> List[Dict[str, Any]]:
        """
        Scrape user's comments.
        
        Args:
            username: Reddit username
            limit: Maximum number of comments to fetch
            
        Returns:
            List of comment dictionaries
        """
        comments = []
        url = f"https://old.reddit.com/user/{username}/comments"
        logger.info(f"Scraping comments for user: {username}")
        
        page_count = 0
        max_pages = 5  # Limit pagination
        
        while len(comments) < limit and page_count < max_pages:
            soup = self._get_page_with_retry(url)
            if not soup:
                break
            
            things = soup.select('.thing.comment')
            if not things:
                break
            
            for thing in things:
                if len(comments) >= limit:
                    break
                
                try:
                    body_elem = thing.select_one('.md')
                    time_elem = thing.select_one('time')
                    title_elem = thing.select_one('a.title')
                    
                    comment = {
                        'body': body_elem.text.strip() if body_elem else '',
                        'subreddit': thing.get('data-subreddit', ''),
                        'created_utc': self._parse_timestamp(time_elem),
                        'score': int(thing.get('data-score', 0)),
                        'link_title': title_elem.text.strip() if title_elem else '',
                        'permalink': thing.get('data-permalink', '')
                    }
                    comments.append(comment)
                except Exception as e:
                    logger.warning(f"Error parsing comment: {e}")
                    continue
            
            # Check for next page
            next_btn = soup.select_one('.next-button a')
            if next_btn and next_btn.get('href'):
                url = next_btn['href']
                page_count += 1
            else:
                break
        
        logger.info(f"Scraped {len(comments)} comments for {username}")
        return comments[:limit]
    
    def scrape_subreddit(self, subreddit_name: str, limit: int = 100) -> Dict[str, Any]:
        """
        Scrape subreddit information and recent posts.
        
        Args:
            subreddit_name: Name of subreddit (without r/ prefix)
            limit: Maximum number of posts to fetch
            
        Returns:
            Dict containing subreddit info and posts
        """
        url = f"https://old.reddit.com/r/{subreddit_name}"
        logger.info(f"Scraping subreddit: {subreddit_name}")
        
        soup = self._get_page_with_retry(url)
        if not soup:
            return {'error': 'not_found', 'message': f'Subreddit r/{subreddit_name} not found or unavailable'}
        
        # Check if subreddit exists
        if soup.select_one('.error') or 'page not found' in soup.text.lower():
            return {'error': 'not_found', 'message': f'Subreddit "r/{subreddit_name}" not found'}
        
        try:
            # Extract subreddit info from sidebar
            subscribers_elem = soup.select_one('.subscribers .number')
            active_elem = soup.select_one('.users-online .number')
            description_elem = soup.select_one('.md.wiki') or soup.select_one('.usertext-body .md')
            
            subscribers = 0
            if subscribers_elem:
                try:
                    subscribers = int(subscribers_elem.text.strip().replace(',', ''))
                except:
                    pass
            
            active_users = 0
            if active_elem:
                try:
                    active_users = int(active_elem.text.strip().replace(',', ''))
                except:
                    pass
            
            description = description_elem.text.strip() if description_elem else ''
            
            # Extract creation date from sidebar
            created_elem = soup.select_one('.bottom .age time')
            created_utc = self._parse_timestamp(created_elem)
            
            subreddit_data = {
                'display_name': subreddit_name,
                'display_name_prefixed': f'r/{subreddit_name}',
                'subscribers': subscribers,
                'accounts_active': active_users,
                'active_user_count': active_users,
                'public_description': description[:500] if description else '',
                'created_utc': created_utc
            }
            
            # Scrape posts
            posts = self._scrape_subreddit_posts(soup, subreddit_name, limit)
            
            return {
                'subreddit': subreddit_data,
                'posts': posts,
                'weeklyVisitors': active_users,
                'activeUsers': active_users
            }
        except Exception as e:
            logger.error(f"Error parsing subreddit: {e}")
            return {'error': 'parse_error', 'message': str(e)}
    
    def _scrape_subreddit_posts(self, initial_soup: BeautifulSoup, subreddit_name: str, limit: int) -> List[Dict[str, Any]]:
        """Helper to scrape posts from subreddit pages."""
        posts = []
        soup = initial_soup
        url = f"https://old.reddit.com/r/{subreddit_name}/new"
        
        # Start with new posts
        soup = self._get_page_with_retry(url)
        if not soup:
            soup = initial_soup
        
        page_count = 0
        max_pages = 5  # Limit pagination to avoid too many requests
        
        while len(posts) < limit and page_count < max_pages:
            things = soup.select('.thing.link')
            if not things:
                break
            
            for thing in things:
                if len(posts) >= limit:
                    break
                
                try:
                    title_elem = thing.select_one('a.title')
                    time_elem = thing.select_one('time')
                    selftext_elem = thing.select_one('.md')
                    
                    post = {
                        'title': title_elem.text.strip() if title_elem else '',
                        'selftext': selftext_elem.text.strip() if selftext_elem else '',
                        'subreddit': subreddit_name,
                        'created_utc': self._parse_timestamp(time_elem),
                        'score': int(thing.get('data-score', 0)),
                        'num_comments': int(thing.get('data-comments-count', 0)),
                        'url': thing.get('data-url', ''),
                        'permalink': thing.get('data-permalink', ''),
                        'author': thing.get('data-author', '')
                    }
                    posts.append(post)
                except Exception as e:
                    logger.warning(f"Error parsing subreddit post: {e}")
                    continue
            
            # Check for next page
            next_btn = soup.select_one('.next-button a')
            if next_btn and next_btn.get('href'):
                soup = self._get_page_with_retry(next_btn['href'])
                if not soup:
                    break
                page_count += 1
            else:
                break
        
        logger.info(f"Scraped {len(posts)} posts from r/{subreddit_name}")
        return posts
    
    def search_reddit(self, keyword: str, limit: int = 100) -> Dict[str, Any]:
        """
        Search for keyword across Reddit.
        
        Args:
            keyword: Search term
            limit: Maximum number of results
            
        Returns:
            Dict containing search results
        """
        import urllib.parse
        encoded_keyword = urllib.parse.quote(keyword)
        url = f"https://old.reddit.com/search?q={encoded_keyword}&sort=relevance&t=week"
        logger.info(f"Searching Reddit for: {keyword}")
        
        posts = []
        page_count = 0
        max_pages = 5
        
        while len(posts) < limit and page_count < max_pages:
            soup = self._get_page_with_retry(url)
            if not soup:
                break
            
            things = soup.select('.thing.link')
            if not things:
                break
            
            for thing in things:
                if len(posts) >= limit:
                    break
                
                try:
                    title_elem = thing.select_one('a.title')
                    time_elem = thing.select_one('time')
                    selftext_elem = thing.select_one('.md')
                    
                    post = {
                        'title': title_elem.text.strip() if title_elem else '',
                        'selftext': selftext_elem.text.strip() if selftext_elem else '',
                        'subreddit': thing.get('data-subreddit', ''),
                        'created_utc': self._parse_timestamp(time_elem),
                        'score': int(thing.get('data-score', 0)),
                        'num_comments': int(thing.get('data-comments-count', 0)),
                        'url': thing.get('data-url', ''),
                        'permalink': thing.get('data-permalink', ''),
                        'author': thing.get('data-author', '')
                    }
                    posts.append(post)
                except Exception as e:
                    logger.warning(f"Error parsing search result: {e}")
                    continue
            
            # Check for next page
            next_btn = soup.select_one('.next-button a')
            if next_btn and next_btn.get('href'):
                url = next_btn['href']
                page_count += 1
            else:
                break
        
        logger.info(f"Found {len(posts)} results for '{keyword}'")
        return {
            'posts': posts,
            'keyword': keyword
        }
    
    def close(self):
        """Close the WebDriver."""
        if self.driver:
            self.driver.quit()
            logger.info("WebDriver closed")


# Initialize scraper (singleton)
scraper = None


def get_scraper() -> RedditScraper:
    """Get or create the scraper instance."""
    global scraper
    if scraper is None:
        scraper = RedditScraper()
    return scraper


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify({'status': 'healthy', 'service': 'reddit-scraper'})


@app.route('/scrape', methods=['POST', 'OPTIONS'])
def scrape():
    """
    Main scraping endpoint.
    
    Request body:
    {
        "type": "user" | "community" | "search",
        "username": "...",  // for user type
        "subreddit": "...", // for community type
        "keyword": "..."    // for search type
    }
    """
    if request.method == 'OPTIONS':
        return '', 204
    
    try:
        data = request.json
        scrape_type = data.get('type')
        
        logger.info(f"Received scrape request: type={scrape_type}")
        
        reddit_scraper = get_scraper()
        
        if scrape_type == 'user':
            username = data.get('username', '').strip()
            if not username:
                return jsonify({'error': 'bad_request', 'message': 'Username is required'}), 400
            
            # Scrape user profile
            user_data = reddit_scraper.scrape_user_profile(username)
            if user_data.get('error'):
                status_code = 404 if user_data['error'] == 'not_found' else 500
                return jsonify(user_data), status_code
            
            # Scrape posts and comments
            posts = reddit_scraper.scrape_user_posts(username)
            comments = reddit_scraper.scrape_user_comments(username)
            
            return jsonify({
                'user': user_data,
                'posts': posts,
                'comments': comments,
                'communityRelations': []
            })
        
        elif scrape_type == 'community':
            subreddit = data.get('subreddit', '').strip()
            if not subreddit:
                return jsonify({'error': 'bad_request', 'message': 'Subreddit name is required'}), 400
            
            result = reddit_scraper.scrape_subreddit(subreddit)
            if result.get('error'):
                status_code = 404 if result['error'] == 'not_found' else 500
                return jsonify(result), status_code
            
            return jsonify(result)
        
        elif scrape_type == 'search':
            keyword = data.get('keyword', '').strip()
            if not keyword:
                return jsonify({'error': 'bad_request', 'message': 'Keyword is required'}), 400
            
            result = reddit_scraper.search_reddit(keyword)
            return jsonify(result)
        
        else:
            return jsonify({'error': 'bad_request', 'message': f'Invalid type: {scrape_type}'}), 400
    
    except Exception as e:
        logger.error(f"Error in scrape endpoint: {e}")
        return jsonify({'error': 'internal_error', 'message': str(e)}), 500


@app.route('/close', methods=['POST'])
def close_scraper():
    """Close the scraper WebDriver."""
    global scraper
    if scraper:
        scraper.close()
        scraper = None
    return jsonify({'status': 'closed'})


@app.route('/rotate', methods=['POST'])
def rotate_session():
    """Force rotate the browser session."""
    global scraper
    if scraper:
        scraper._rotate_session()
        return jsonify({'status': 'rotated'})
    return jsonify({'status': 'no_scraper'})


if __name__ == '__main__':
    port = int(os.environ.get('SCRAPER_PORT', 5001))
    logger.info(f"Starting Reddit Scraper Server on port {port}")
    logger.info("Anti-blocking measures enabled: session rotation, random delays, human simulation")
    
    try:
        # Pre-initialize the scraper
        get_scraper()
        app.run(host='0.0.0.0', port=port, debug=False)
    except KeyboardInterrupt:
        logger.info("Shutting down...")
        if scraper:
            scraper.close()
