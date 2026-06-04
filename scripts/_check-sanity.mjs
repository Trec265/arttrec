import https from 'https';
const q = encodeURIComponent('*[_type == "project"]{_id,title,"slug":slug.current,"pc":count(pieces),"pt":pieces[].title}');
const url = `https://lu1mcd6s.api.sanity.io/v2024-01-01/data/query/production?query=${q}`;
https.get(url, res => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => console.log(JSON.stringify(JSON.parse(d).result, null, 2)));
});
