@echo off
cd /d "C:\Users\Pusala Siddhartha\Downloads\ConceptClarity-infosys_project\backend"
py -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
