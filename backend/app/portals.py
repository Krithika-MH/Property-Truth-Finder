"""
State RERA Portal Adapter Registry.
Currently implements Karnataka RERA (MVP) and defines the schema/interface for future state expansions.
"""

from typing import Dict, Any

PORTAL_REGISTRY: Dict[str, Dict[str, Any]] = {
    "KA": {
        "state_code": "KA",
        "state_name": "Karnataka",
        "portal_name": "Karnataka RERA",
        "start_url": "https://rera.karnataka.gov.in",
        "search_url": "https://rera.karnataka.gov.in/projectSearch",
        "supported": True,
        "goal_template": (
            "Open the section for registered projects (menu may be named 'Services', 'Projects' or "
            "'Registered Projects' / 'Project Search'). Search by registration number \"{rera_no}\" if provided; "
            "otherwise search by project name \"{project_name}\" and the district or taluk \"{district_guess}\". "
            "Open the best matching project's detail page. If more than one candidate matches, open the one whose promoter "
            "resembles \"{builder_name}\". Extract: registration number, project name, promoter name, project location, "
            "district, taluk, project status, proposed (declared) date of completion, registration date, and the "
            "apartment types with their carpet areas. Also report whether you were able to run a search and whether any "
            "result was found. Return JSON."
        ),
        "schema": {
            "type": "object",
            "properties": {
                "blocked": {"type": "boolean"},
                "blocked_reason": {"type": "string"},
                "search_performed": {"type": "boolean"},
                "found": {"type": "boolean"},
                "searched_by": {"type": "string"},
                "page_url": {"type": "string"},
                "registration_no": {"type": "string"},
                "project_name": {"type": "string"},
                "promoter_name": {"type": "string"},
                "location_text": {"type": "string"},
                "district": {"type": "string"},
                "proposed_completion_text": {"type": "string"},
                "registered_on_text": {"type": "string"},
                "status_text": {"type": "string"},
                "unit_areas": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "label": {"type": "string"},
                            "carpet_area_text": {"type": "string"}
                        }
                    }
                }
            },
            "required": ["search_performed", "found"]
        }
    },
    "MH": {
        "state_code": "MH",
        "state_name": "Maharashtra",
        "portal_name": "MahaRERA",
        "start_url": "https://maharera.maharashtra.gov.in",
        "supported": False, # Marked coming soon
        "status_note": "Coming soon in Phase 2 expansions"
    }
}

def get_portal_adapter(state_code: str = "KA") -> Dict[str, Any]:
    return PORTAL_REGISTRY.get(state_code.upper(), PORTAL_REGISTRY["KA"])

def infer_state_from_rera(rera_number: str, city: str = "") -> str:
    if not rera_number:
        if city and ("bangalore" in city.lower() or "bengaluru" in city.lower() or "mysore" in city.lower()):
            return "KA"
        return "KA"
    
    clean = rera_number.upper().replace(" ", "").replace("-", "/")
    if "PRM/KA/RERA" in clean or "/KA/" in clean:
        return "KA"
    if "P5" in clean or "/MH/" in clean:
        return "MH"
    return "KA"
