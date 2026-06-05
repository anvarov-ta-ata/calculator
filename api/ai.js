export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.YANDEX_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API ключ не настроен' });

  const { message, history = [] } = req.body || {};
  if (!message) return res.status(400).json({ error: 'Нет вопроса' });

  const systemPrompt = `Ты эксперт-нефтяник. Отвечай кратко и по делу на русском языке. Тема: скважины, УЭЦН, ШГН, ЧРП, КРС, ПРС, дебит, глушение, нефтедобыча. На посторонние вопросы не отвечай.`;

  // Формируем сообщения для YandexGPT
  const messages = [
    { role: 'system', text: systemPrompt }
  ];

  // Добавляем историю (максимум 6 последних)
  const recentHistory = history.slice(-6);
  for (const h of recentHistory) {
    messages.push({ role: h.role === 'user' ? 'user' : 'assistant', text: h.text });
  }

  // Добавляем текущий вопрос
  messages.push({ role: 'user', text: message });

  try {
    const response = await fetch('https://llm.api.cloud.yandex.net/foundationModels/v1/completion', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Api-Key ${apiKey}`
      },
      body: JSON.stringify({
        modelUri: 'gpt://b1gidah2iaqvund478bq/yandexgpt-lite',
        completionOptions: {
          stream: false,
          temperature: 0.4,
          maxTokens: 800
        },
        messages: messages
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('YandexGPT error:', data);
      return res.status(500).json({ error: data.message || 'Ошибка YandexGPT' });
    }

    const answer = data?.result?.alternatives?.[0]?.message?.text || 'Нет ответа';
    return res.status(200).json({ answer });

  } catch (e) {
    console.error('Fetch error:', e);
    return res.status(500).json({ error: 'Ошибка соединения с YandexGPT' });
  }
}
