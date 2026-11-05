"""
Demo Scenario Dataset for Workshop Parts Desk
Strictly satisfies:
- Exactly 6 customer requests
- Exactly 12 fictional parts
- Technical descriptions in natural language prose
- Recent and Aged snapshots
- Exactly two aged snapshot discrepancies:
  - Part P-105: Aged snapshot = 1, actual warehouse stock = 0 (OVERSTATED)
  - Part P-108: Aged snapshot = 0, actual warehouse stock = 1 (UNDERSTATED)
- Scripted clarification responses
"""

DEMO_PARTS = [
    {
        "id": "PART-101",
        "name": "VoltCraft Alpha Power Supply",
        "voltage": 12.0,
        "connector": "USB-C",
        "wattage": 20.0,
        "snapshot_quantity": 1,
        "snapshot_freshness": "RECENT",
        "warehouse_actual_stock": 1,
        "technical_description": "Compact workshop power unit engineered for steady 12-volt output. Equipped with a standard reversible USB-C interface. Delivers a continuous 20 Watts of regulated direct current. Built with overload safety cutoffs.",
        "compatibility_notes": "Native USB-C receptacle; compatible with modern Type-C low-voltage power harnesses."
    },
    {
        "id": "PART-102",
        "name": "VoltCraft Beta Power Supply",
        "voltage": 12.0,
        "connector": "Barrel-5.5mm",
        "wattage": 10.0,
        "snapshot_quantity": 1,
        "snapshot_freshness": "RECENT",
        "warehouse_actual_stock": 1,
        "technical_description": "Legacy 12-volt power adapter featuring a standard 5.5mm barrel plug connector (center positive). Rated at 10 Watts steady delivery for bench testing and small instrumentation.",
        "compatibility_notes": "Fits circular 5.5mm x 2.1mm coaxial barrel jacks. Incompatible with USB or DIN ports."
    },
    {
        "id": "PART-103",
        "name": "MegaVolt Titan 24",
        "voltage": 24.0,
        "connector": "Screw-Terminal",
        "wattage": 30.0,
        "snapshot_quantity": 1,
        "snapshot_freshness": "RECENT",
        "warehouse_actual_stock": 1,
        "technical_description": "High-draw industrial regulator providing 24 volts with sturdy industrial screw-terminal blocks. Rated for up to 30 Watts sustained throughput.",
        "compatibility_notes": "Requires bare stripped wire or crimp spade lugs into heavy screw terminals."
    },
    {
        "id": "PART-104",
        "name": "MicroSupply Nano-5",
        "voltage": 5.0,
        "connector": "Micro-USB",
        "wattage": 10.0,
        "snapshot_quantity": 1,
        "snapshot_freshness": "RECENT",
        "warehouse_actual_stock": 1,
        "technical_description": "5-volt micro controller power rail with standard trapezoidal Micro-USB female jack. Max output capability is 10 Watts.",
        "compatibility_notes": "Standard USB 2.0 Micro-B connector. Incompatible with USB-C or barrel connectors."
    },
    {
        "id": "PART-105",
        "name": "AeroDrive Phantom 12",
        "voltage": 12.0,
        "connector": "USB-C",
        "wattage": 30.0,
        "snapshot_quantity": 1,
        "snapshot_freshness": "AGED",
        "warehouse_actual_stock": 0,  # DISCREPANCY TYPE A: Aged says 1, warehouse has 0
        "technical_description": "High-power 12-volt heavy bench supply with dual USB-C power delivery ports capable of delivering 30 Watts sustained.",
        "compatibility_notes": "USB-C compliant port. Note: Aged ledger indicates 1 unit, but physical bin has 0."
    },
    {
        "id": "PART-106",
        "name": "PrecisionCraft 12-X",
        "voltage": 12.0,
        "connector": "USB-C",
        "wattage": 10.0,
        "snapshot_quantity": 1,
        "snapshot_freshness": "RECENT",
        "warehouse_actual_stock": 1,
        "technical_description": "Economy 12-volt DC converter terminating in an oval USB-C connector. Optimized for compact devices demanding 10 Watts maximum.",
        "compatibility_notes": "Standard USB Type-C interface. Cannot safely drive loads exceeding 10 Watts."
    },
    {
        "id": "PART-107",
        "name": "ElectroPro 18 Multi",
        "voltage": 18.0,
        "connector": "DIN-4",
        "wattage": 20.0,
        "snapshot_quantity": 1,
        "snapshot_freshness": "RECENT",
        "warehouse_actual_stock": 1,
        "technical_description": "18-volt specialized driver housing a locking circular 4-pin DIN connector. Delivers 20 Watts clean output.",
        "compatibility_notes": "4-pin circular locking DIN jack only. Highly specialized audio/bench connector."
    },
    {
        "id": "PART-108",
        "name": "SparkMaster Hidden 24",
        "voltage": 24.0,
        "connector": "Barrel-5.5mm",
        "wattage": 20.0,
        "snapshot_quantity": 0,
        "snapshot_freshness": "AGED",
        "warehouse_actual_stock": 1,  # DISCREPANCY TYPE B: Aged says 0, warehouse has 1
        "technical_description": "Ruggedized 24-volt transformer equipped with a standard 5.5mm industrial barrel jack. Delivers 20 Watts continuous DC.",
        "compatibility_notes": "Standard 5.5mm coaxial plug. Aged inventory showed 0 due to untracked shelf intake, but bin holds 1 verified unit."
    },
    {
        "id": "PART-109",
        "name": "EcoVolt 5-Lite",
        "voltage": 5.0,
        "connector": "USB-C",
        "wattage": 10.0,
        "snapshot_quantity": 1,
        "snapshot_freshness": "RECENT",
        "warehouse_actual_stock": 1,
        "technical_description": "Lightweight 5-volt USB-C direct feed. Outputs 10 Watts for low-power sensors and microcontrollers.",
        "compatibility_notes": "USB Type-C port."
    },
    {
        "id": "PART-110",
        "name": "PowerStation 48 Heavy",
        "voltage": 48.0,
        "connector": "Screw-Terminal",
        "wattage": 50.0,
        "snapshot_quantity": 1,
        "snapshot_freshness": "AGED",
        "warehouse_actual_stock": 1,
        "technical_description": "Industrial telecommunications 48-volt rack power supply with twin screw-terminal studs. Output capacity 50 Watts.",
        "compatibility_notes": "Heavy screw terminal lugs only. Not suited for low-voltage circuits."
    },
    {
        "id": "PART-111",
        "name": "DuraVolt 12 Slim",
        "voltage": 12.0,
        "connector": "Barrel-5.5mm",
        "wattage": 20.0,
        "snapshot_quantity": 1,
        "snapshot_freshness": "RECENT",
        "warehouse_actual_stock": 1,
        "technical_description": "Slimline 12-volt enclosure with a reinforced 5.5mm center-positive barrel connector. Output rated at 20 Watts.",
        "compatibility_notes": "Barrel-5.5mm jack."
    },
    {
        "id": "PART-112",
        "name": "UniversalLab 15 Precision",
        "voltage": 15.0,
        "connector": "Banana-Plug",
        "wattage": 25.0,
        "snapshot_quantity": 1,
        "snapshot_freshness": "AGED",
        "warehouse_actual_stock": 1,
        "technical_description": "Laboratory 15-volt stabilized reference source with dual front-panel 4mm banana jacks. Capable of 25 Watts continuous output.",
        "compatibility_notes": "Dual 4mm banana jacks for laboratory multimeters and test probes."
    }
]

DEMO_REQUESTS = [
    {
        "id": "REQ-001",
        "customer_name": "Alice - Tech Repair Lab",
        "original_message": "Hello, I need a replacement power unit that provides 12 volts, plugs in with a USB-C connector, and can handle at least 20 watts of power for our diagnostic tablet.",
        "scripted_clarifications": {}
    },
    {
        "id": "REQ-002",
        "customer_name": "Bob - CNC Automation",
        "original_message": "Hi parts desk, looking for a 24V supply using a standard 5.5mm barrel plug. Minimum wattage needed is 20W.",
        "scripted_clarifications": {}
    },
    {
        "id": "REQ-003",
        "customer_name": "Charlie - Sensor Systems",
        "original_message": "We need a power source with a USB-C connector providing at least 10 watts, but I forgot whether our board takes 5V or 12V.",
        "scripted_clarifications": {
            "voltage": "I just checked our hardware schematic! The board strictly requires 5 volts."
        }
    },
    {
        "id": "REQ-004",
        "customer_name": "Diana - Marine Electronics",
        "original_message": "Need a 12V unit with at least 20W minimum power, but not sure which connector socket is installed on the chassis.",
        "scripted_clarifications": {
            "connector": "The chassis inspection is done: it has an oval USB-C input jack."
        }
    },
    {
        "id": "REQ-005",
        "customer_name": "Evan - Prototyping Workshop",
        "original_message": "Please send a 12 volt power supply with a 5.5mm barrel plug. Need at least 20W.",
        "scripted_clarifications": {}
    },
    {
        "id": "REQ-006",
        "customer_name": "Fiona - Robotics Lab",
        "original_message": "Hi! We need a 36-volt power source with a military DIN connector rated for at least 40 watts for our underwater rover.",
        "scripted_clarifications": {}
    }
]
