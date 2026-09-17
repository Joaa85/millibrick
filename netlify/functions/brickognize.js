// Proxy mot Brickognize sitt predict-endepunkt.
// Grunnen til at dette går via en Netlify-funksjon i stedet for et rett
// kall fra nettleseren: Brickognize sin API har historisk blokkert
// direkte CORS-kall fra vilkårlige nettsteder, noe som gjorde at
// "Skann kloss"-fanen ofte feilet med en generisk feilmelding. Et
// server-til-server-kall har ingen CORS-begrensning.
exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: '',
    };
  }
 
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
 
  try {
    const { image, filename, mediaType } = JSON.parse(event.body || '{}');
    if (!image) {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Mangler bilde (image, base64)' }),
      };
    }
 
    const buffer = Buffer.from(image, 'base64');
    const blob = new Blob([buffer], { type: mediaType || 'image/jpeg' });
    const fd = new FormData();
    fd.append('query_image', blob, filename || 'photo.jpg');
 
    const res = await fetch('https://api.brickognize.com/predict/', {
      method: 'POST',
      headers: { accept: 'application/json' },
      body: fd,
    });
 
    const data = await res.json();
    return {
      statusCode: res.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(data),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: error.message }),
    };
  }
};
 
