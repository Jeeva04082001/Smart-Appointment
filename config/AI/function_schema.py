def tools():
    return [
        {
            "name":"book_appointment",
        "description":"Book a doctor appointment using doctor id, date and time slot",
        "parameters":{
            "type": "object",
            "properties": {
                "doctor": {
                    "type": "integer",
                    "description": "Doctor ID"
                },
                "date": {
                    "type": "string",
                    "description": "Appointment date in YYYY-MM-DD format"
                },
                "time_slot": {
                    "type": "string",
                    "description": "Appointment time in HH:MM:SS format"
                }
            },
            "required": [
                "doctor",
                "date",
                "time_slot"
            ]
        }
    
        }

        ]