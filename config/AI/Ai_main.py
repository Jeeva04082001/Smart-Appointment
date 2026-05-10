from google import genai
from google.genai import types
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from function_schema import tools
from pydantic import BaseModel
import json
import requests


app = FastAPI() 
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


client = genai.Client(api_key='AIzaSyCifYDojLzNXQ84Kl4xGonEpHr0Kn3OeoY')
contents = []

with open("system_prompt.txt", "r") as f:
    instruction = f.read()

tools = types.Tool(function_declarations=tools())

USERS_SESSIONS = {}

def text_form(text: str):
    return types.UserContent(
        parts=[
            types.Part.from_text(text=text)
        ]
    )

def function_form(name: str, args: dict):
    return types.ModelContent(
        parts=[
            types.Part.from_function_call(
                name=name,
                args=args
            )
        ]
    )

def function_response_form(name: str, response: str):
    return types.UserContent(
        parts=[
            types.Part.from_function_response(
                name=name,
                response={"result": response}
            )
        ]
    )

def model_text_form(text: str):
    return types.ModelContent(
        parts=[
            types.Part.from_text(text=text)
        ]
    )


class ChatInput(BaseModel):
    query: str
    user_id: str

@app.post("/start_chat")
async def start_chat(data: ChatInput):

    final_response_payload = {
        "text": "",
        "llm": ""
    }

    user_query = data.query
    user_id = data.user_id
    print(f"User Query: {user_query}")
    print(f"User ID: {user_id}")


    if user_id not in USERS_SESSIONS:
        USERS_SESSIONS[user_id] = []

    USERS_SESSIONS[user_id].append(text_form(user_query))

    if user_query.lower().strip() in ["hi", "hello"]:
        final_response_payload["text"] = "Hello! How can I assist you today?"
        final_response_payload["llm"] = "Hello! How can I assist you today?"
        USERS_SESSIONS[user_id].append(model_text_form(final_response_payload["text"]))
        return final_response_payload["llm"]

    else:

        response = await client.aio.models.generate_content(
        model="gemini-2.5-flash",
        contents=USERS_SESSIONS[user_id],
        config=types.GenerateContentConfig(
                system_instruction=instruction,
                tools=[tools],  # tools should already be a list
            ),
        )

        parts = response.candidates[0].content.parts

        function_calls = []
        text_output = ""

        USERS_SESSIONS[user_id].append(parts)
        
        for part in parts:
            if hasattr(part, "function_call") and part.function_call:
                function_calls.append(part.function_call)

            if hasattr(part, "text") and part.text:
                text_output += part.text

        # ---- Handle function calls ----
        if function_calls:
            for call in function_calls:
                print("Function Call Detected:")
                print("Name:", call.name)
                print("Args:", call.args)

                if call.name == "book_appointment":

                    # Extract arguments from Gemini
                    args = dict(call.args)

                    # API endpoint
                    url = "http://localhost:8011/api/appointments/book/"

                    # Request payload
                    payload = json.dumps({
                        "doctor": args["doctor"],
                        "date": args["date"],
                        "time_slot": args["time_slot"]
                    })

                    # Headers
                    headers = {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzc4MzE3OTU0LCJpYXQiOjE3NzgzMTQzNTQsImp0aSI6ImJkMTY4ODA5NDE3NjQzZjFiYmNhMWJlOTBiZmM0NzI5IiwidXNlcl9pZCI6IjQiLCJyb2xlIjoiUEFUSUVOVCIsInVzZXJuYW1lIjoiSmVldmEifQ.VFTthGfJQNoOaHnu3hIl3skFxGUSPdn-nbIRPVV24k0'
                    }

                    # Send request
                    api_response = requests.post(
                        url,
                        headers=headers,
                        data=payload
                    )

                    # Response handling
                    if api_response.status_code in [200, 201]:

                        print("Your appointment booked successfully")

                        final_response_payload = {
                            "llm": "Your appointment booked successfully",
                            "text": "Your appointment booked successfully"
                        }

                    else:

                        print("Failed to book appointment")

                        final_response_payload = {
                            "llm": f"Booking failed: {api_response.text}",
                            "text": f"Booking failed: {api_response.text}"
                        }

                    USERS_SESSIONS[user_id].append(
                        function_response_form(
                            call.name,
                            final_response_payload
                        )
                    )
        # ---- Handle normal text response ----
        if text_output:
            print("Bot:", text_output)
            final_response_payload["text"] += "\n" + text_output
            final_response_payload["llm"] += "\n" + text_output


    return final_response_payload["text"]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8900)

