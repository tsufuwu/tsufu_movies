import re
html = open('temp_embed.html', 'r', encoding='utf-8').read()
pat = r'<script[^>]*src=["\'][^"\']*ads\.js[^"\']*["\'][^>]*(?:onerror=["\'][^"\']*["\'])?[^>]*>\s*</script>'
print('Matched ads.js?', bool(re.search(pat, html, re.IGNORECASE | re.DOTALL)))
