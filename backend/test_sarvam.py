import httpx
import asyncio

SARVAM_API_URL = "https://api.sarvam.ai/speech-to-text-translate"
SARVAM_API_KEY = "sk_0hn69fin_ZJTHrjh5aVgGR8k2ZSgRNeuV"

async def test():
    files = {
        'file': ("test.wav", b"RIFF$" + b"\x00"*34 + b"dummy", "audio/wav")
    }
    data = {
        "model": "saaras:v1"
    }
    headers = {
        "api-subscription-key": SARVAM_API_KEY
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.post(SARVAM_API_URL, data=data, files=files, headers=headers)
        print("Status code:", response.status_code)
        print("Response:", response.text)

asyncio.run(test())
