from app.agents.specification_agent import SpecificationAgent

def test_extraction_complete_message():
    agent = SpecificationAgent()
    text = "I need a power supply that works at 12 volts, uses a USB-C connector and provides at least 20 watts."
    specs, usage = agent.extract_specifications(text)

    assert specs.voltage.value == 12.0
    assert specs.voltage.status == "known"
    assert specs.connector.value == "USB-C"
    assert specs.connector.status == "known"
    assert specs.minimum_wattage.value == 20.0
    assert specs.minimum_wattage.status == "known"
    assert len(specs.missing_fields) == 0
    assert len(specs.ambiguous_fields) == 0

def test_extraction_ambiguous_voltage():
    agent = SpecificationAgent()
    text = "We need a power source with a USB-C connector providing at least 10 watts, but I forgot whether our board takes 5V or 12V."
    specs, usage = agent.extract_specifications(text)

    assert specs.voltage.status == "ambiguous"
    assert "voltage" in specs.ambiguous_fields
    assert specs.connector.value == "USB-C"
    assert specs.minimum_wattage.value == 10.0

def test_extraction_missing_connector():
    agent = SpecificationAgent()
    text = "Need a 12V unit with at least 20W minimum power, but not sure which connector socket is installed on the chassis."
    specs, usage = agent.extract_specifications(text)

    assert specs.voltage.value == 12.0
    assert specs.connector.status == "missing"
    assert "connector" in specs.missing_fields
    assert specs.minimum_wattage.value == 20.0
