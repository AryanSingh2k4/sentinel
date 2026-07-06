import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function testGemini() {
  const url = `${process.env.OPENAI_BASE_URL}/chat/completions`;
  const key = process.env.OPENAI_API_KEY;
  const model = process.env.LLM_MODEL;

  console.log(`URL: ${url}`);
  console.log(`Model: ${model}`);
  
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: 'user', content: 'Say hi in JSON format: {"msg": "hi"}' }]
      })
    });
    
    if (!res.ok) {
      console.error(`Status: ${res.status}`);
      console.error(await res.text());
      return;
    }
    
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (e) {
    console.error(e);
  }
}

testGemini();
