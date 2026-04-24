import https from 'https';

async function fetchSearch() {
  const q = encodeURIComponent('"webToNative" fcm token');
  https.get(`https://api.github.com/search/code?q=${q}`, {
    headers: { 'User-Agent': 'Node.js' }
  }, (res) => {
    let data = '';
    res.on('data', d => data += d);
    res.on('end', () => {
        try {
          const json = JSON.parse(data);
          console.log("Total count:", json.total_count);
          if (json.items && json.items.length > 0) {
            console.log(json.items[0].html_url);
            console.log(json.items[1]?.html_url);
          } else {
             console.log(json);
          }
        } catch(e) { console.error(e) }
    });
  });
}
fetchSearch();
