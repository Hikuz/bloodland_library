const { google } = require('googleapis');

// Configuración desde variables de entorno
const auth = new google.auth.JWT(
  process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
  null,
  (process.env.GOOGLE_SHEETS_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  ['https://www.googleapis.com/auth/spreadsheets']
);

const sheets = google.sheets({ version: 'v4', auth });
const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SHEET_ID;
const RANGE = 'ass'; // nombre de la hoja

export default async function handler(req, res) {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    switch (req.method) {
      case 'GET':
        // Leer todos los personajes
        const readResponse = await sheets.spreadsheets.values.get({
          spreadsheetId: SPREADSHEET_ID,
          range: `${RANGE}!A:G`,
        });
        
        const rows = readResponse.data.values || [];
        if (rows.length === 0) {
          return res.status(200).json([]);
        }
        
        const headers = rows[0];
        const characters = rows.slice(1).map((row, index) => {
          const character = {};
          headers.forEach((header, i) => {
            character[header] = row[i] || '';
          });
          character.rowIndex = index + 2; // +2 por header + índice base 0
          return character;
        });
        
        return res.status(200).json(characters);

      case 'POST':
        // Crear nuevo personaje
        const newCharacter = req.body;
        const newValues = [
          newCharacter.Name || '',
          newCharacter['Character Role'] || '',
          newCharacter.Part || '',
          newCharacter.Designer || '',
          newCharacter['Origin Dimension'] || '',
          newCharacter.Summary || '',
          newCharacter.Image || ''
        ];
        
        await sheets.spreadsheets.values.append({
          spreadsheetId: SPREADSHEET_ID,
          range: `${RANGE}!A:G`,
          valueInputOption: 'USER_ENTERED',
          insertDataOption: 'INSERT_ROWS',
          resource: { values: [newValues] }
        });
        
        return res.status(201).json({ message: 'Character created' });

      case 'PATCH':
        // Actualizar personaje
        const { rowId, updates } = req.body;
        const updateValues = [
          updates.Name || '',
          updates['Character Role'] || '',
          updates.Part || '',
          updates.Designer || '',
          updates['Origin Dimension'] || '',
          updates.Summary || '',
          updates.Image || ''
        ];
        
        await sheets.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID,
          range: `${RANGE}!A${rowId}:G${rowId}`,
          valueInputOption: 'USER_ENTERED',
          resource: { values: [updateValues] }
        });
        
        return res.status(200).json({ message: 'Character updated' });

      case 'DELETE':
        // Eliminar personaje (limpia la fila pero la deja vacía)
        const { rowId: deleteRowId } = req.body;
        await sheets.spreadsheets.values.clear({
          spreadsheetId: SPREADSHEET_ID,
          range: `${RANGE}!A${deleteRowId}:G${deleteRowId}`,
        });
        
        return res.status(200).json({ message: 'Character deleted' });

      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}