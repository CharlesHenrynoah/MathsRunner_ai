const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/html',
    'Access-Control-Allow-Origin': '*'
  });
  
  const html = `
    <!DOCTYPE html>
    <html>
    <body>
      <pre id="stats"></pre>
      <script>
        const stats = localStorage.getItem('mathrunner_stats_csv');
        document.getElementById('stats').textContent = stats || 'Aucune donnée trouvée';
      </script>
    </body>
    </html>
  `;
  
  res.end(html);
});

server.listen(3001, () => {
  console.log('Serveur démarré sur http://localhost:3001');
});
