Office Pulse - Team Albatros


A real-time, IoT-based office environment monitoring and automation system designed to enhance energy efficiency.


Table of Contents
Demo Video
Project Overview
System Architecture
Hardware Simulation
Tech Stack
Team Members
License
Demo Video


Watch our 3-minute demo video to see Office Pulse in action:


🔗 Link to Office Pulse Demo Video (Drive Link)Project Overview


Modern offices often suffer from significant energy waste due to lights, fans, and other devices being left on after hours or in unoccupied rooms. Office Pulse provides a smart, scalable solution to this problem. Our system remotely monitors office device status and power consumption in real-time, allowing for automated alerts and remote management.


Key features include:
Real-time Monitoring: Live dashboard showing device status (lights, fans) and energy usage.
Automated Alerts: Instant notifications via a Discord bot for after-hours device activity.
Scalable Architecture: Modular design suitable for small offices and large enterprises.
System Architecture


The Office Pulse system is built on a robust, event-driven architecture that ensures seamless communication between hardware and the user interface.


system architecture diagram image link: https://drive.google.com/drive/folders/1a4KDCPGbuNs9XeBt8IUy7LqdqIqRwOSi?usp=sharing



The data flow is as follows:
IoT Hardware Node (Wokwi): Simulates office appliances (LEDs and Relays) using an ESP32. It posts state updates to the cloud.
Cloud Backend: A serverless, PostgreSQL-based backend that processes and stores the incoming data, managing device states and alert rules.
Frontend Dashboard: A modern web interface built with React and TanStack Start that subscribes to real-time database changes, providing an instant view of the office status.
Discord Bot (Captain ASR): An automated bot that receives triggers from the backend to send real-time alerts to a designated Discord channel for critical events.
Hardware Simulation


We use Wokwi for hardware validation, allowing us to simulate the physical setup without needing actual hardware.Office Pulse Hardware Schematic


🔗 Link to Wokwi Simulation: Office Pulse


Simulation Setup:
Microcontroller: ESP32 DevKit V1
Actuators (Simulated Loads):
3x LEDs (representing office lights)
2x Relay Modules (representing office fans/HVAC)
Inputs: Push buttons to toggle device states.
The ESP32 runs firmware that connects to Wi-Fi and makes HTTP POST requests to the backend API to update device states whenever a button is pressed in the simulation.Tech Stack


Office Pulse is built using a modern, type-safe, and efficient technology stack:
Hardware Simulation: Wokwi (ESP32, LEDs, Relays)
Firmware: C++ (Arduino framework)
Backend: Serverless PostgreSQL-based backend with real-time subscriptions.
Frontend: React 19, TanStack Start (full-stack framework), Tailwind CSS.
Database: PostgreSQL (with real-time subscriptions enabled).
Alerts: Discord API (Edge functions trigger bot messages).
👨‍💻 Team Members - Albatros
Member Name
Role
Contact
Awon Bin Kamrul (Leader)
Hardware & Wokwi Lead, GitHub Control & Versioning, Voice over
awonbinkamrul0@gmail.com
Abdullah Al-Zahur Rafi
Backend & Database Architect
abdullah.alzahur.rafi@g.bracu.ac.bd
Mahmudul Islam Sohan
Frontend & UI/UX Lead
mahmudul.islam.sohan@g.bracu.ac.bd

📄 License


This project is licensed under the MIT License - see the LICENSE.md file for details.BRAC University | Presented for the Hackathon at Techathon Nationals & Rover Summit 2026, organized by the IUT Robotics Society 
