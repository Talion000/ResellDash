export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { imageBase64, categories } = req.body

  if (!imageBase64) {
    return res.status(400).json({ error: 'Image manquante' })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'Clé API manquante côté serveur' })
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-6',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/jpeg',
                data: imageBase64,
              }
            },
            {
              type: 'text',
              text: `Analyse cette confirmation de commande et extrait les informations en JSON uniquement, sans texte autour, sans backticks markdown :
{
  "nom": "nom exact du produit",
  "prix_achat": nombre (prix unitaire en euros, sans symbole €),
  "date_achat": "YYYY-MM-DD",
  "plateforme_achat": "nom du site marchand",
  "taille_ref": "taille ou référence si visible, sinon null",
  "quantite": nombre (quantité commandée, 1 si non précisé),
  "categorie": "la plus appropriée parmi : ${(categories || []).join(', ')}"
}
Si une information n'est pas visible, mets null. Réponds UNIQUEMENT avec le JSON valide.`
            }
          ]
        }]
      })
    })

    const data = await response.json()

    if (!response.ok) {
      return res.status(500).json({ error: data.error?.message || 'Erreur API Claude' })
    }

    const text = data.content?.[0]?.text || ''
    // Clean potential markdown
    const clean = text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)

    return res.status(200).json(parsed)
  } catch (e) {
    return res.status(500).json({ error: "Impossible d'analyser l'image. Vérifie que la capture est lisible." })
  }
}
