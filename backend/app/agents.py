import re
from typing import Dict, Any, List, Optional
from urllib.parse import quote_plus

from app.models import (
    ListingData, BuilderData, BuilderConfig, BuilderAmenity,
    RERARecord, RERAUnitArea
)

SAFETY_PREAMBLE = (
    "You are a read-only research agent. Do not log in. Do not submit any form that sends personal data. "
    "Do not click Contact, Enquire, Get Call Back, Download Brochure or any lead-capture button, and never enter a "
    "phone number or email. Never guess: if a value is not visible on the page, omit it. If a CAPTCHA, login wall "
    "or access-denied page stops you, stop and return blocked=true with blocked_reason describing what you saw. "
    "Return only JSON."
)

# Agent L Definitions
AGENT_L_GOAL = (
    f"{SAFETY_PREAMBLE} "
    "On this property listing page, scroll the whole page and expand sections such as 'More details', "
    "'See all amenities' and 'Project details'. Extract: listing title, project name, builder or developer name, "
    "locality, city, BHK configuration, displayed price text and numeric price in INR, area value, area unit "
    "and area type (carpet / built-up / super built-up, from the label next to the area), possession or "
    "completion date text, every RERA registration number shown anywhere on the page (look for labels such as "
    "'RERA ID', 'RERA Registered', 'Reg No'), the full list of amenities, who listed it (owner, agent, builder), "
    "and the final page URL. Return JSON."
)

AGENT_L_FALLBACK_GOAL = (
    f"{SAFETY_PREAMBLE} "
    "Return the project name, builder name, price, area and any RERA number visible on this page."
)

AGENT_L_SCHEMA = {
    "type": "object",
    "properties": {
        "blocked": {"type": "boolean"},
        "blocked_reason": {"type": "string"},
        "listing_title": {"type": "string"},
        "project_name": {"type": "string"},
        "builder_name": {"type": "string"},
        "locality": {"type": "string"},
        "city": {"type": "string"},
        "config_bhk": {"type": "string"},
        "price_text": {"type": "string"},
        "price_inr": {"type": "number"},
        "area_value": {"type": "number"},
        "area_unit": {"type": "string"},
        "area_type": {"type": "string"},
        "possession_text": {"type": "string"},
        "rera_numbers": {"type": "array", "items": {"type": "string"}},
        "amenities": {"type": "array", "items": {"type": "string"}},
        "listed_by": {"type": "string"},
        "page_url": {"type": "string"}
    },
    "required": ["blocked"]
}

# Agent D Definitions
def build_agent_d_url(project_name: str, builder_name: str) -> str:
    query = f"{project_name} {builder_name} official website"
    return f"https://duckduckgo.com/?q={quote_plus(query)}"

AGENT_D_GOAL = (
    f"{SAFETY_PREAMBLE} "
    "Read the first page of organic search results. Return up to 8 results as {title, url, snippet}. "
    "Skip ads. Do not open result pages. Return JSON."
)

AGENT_D_SCHEMA = {
    "type": "object",
    "properties": {
        "results": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "url": {"type": "string"},
                    "snippet": {"type": "string"}
                }
            }
        }
    },
    "required": ["results"]
}

# Agent B Definitions
def build_agent_b_goal(project_name: str, builder_name: str, locality: str = "", city: str = "") -> str:
    loc_str = f"{locality}, {city}".strip(", ")
    return (
        f"{SAFETY_PREAMBLE} "
        f"Find the page for the residential project named \"{project_name}\" by \"{builder_name}\" in "
        f"\"{loc_str}\". Use the site menu, a Projects or Residential listing, or the site search. If several "
        f"phases exist, note the phase. On the project page, confirm the developer name and location and extract: "
        f"official project name, developer name, location text, each configuration (label, area value, area unit, "
        f"area type, price text, numeric price in INR), starting price, possession or completion date text, project "
        f"status (ongoing / ready / upcoming), the full amenities list with each amenity's status if shown "
        f"(available / under construction / planned), any RERA registration number shown, and the final page URL. "
        f"Return JSON."
    )

AGENT_B_SCHEMA = {
    "type": "object",
    "properties": {
        "blocked": {"type": "boolean"},
        "blocked_reason": {"type": "string"},
        "found_project_page": {"type": "boolean"},
        "page_url": {"type": "string"},
        "project_name": {"type": "string"},
        "developer_name": {"type": "string"},
        "location_text": {"type": "string"},
        "configs": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "label": {"type": "string"},
                    "area_value": {"type": "number"},
                    "area_unit": {"type": "string"},
                    "area_type": {"type": "string"},
                    "price_text": {"type": "string"},
                    "price_inr": {"type": "number"}
                }
            }
        },
        "price_from_inr": {"type": "number"},
        "possession_text": {"type": "string"},
        "status_text": {"type": "string"},
        "amenities": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "name": {"type": "string"},
                    "status": {"type": "string"}
                }
            }
        },
        "rera_numbers": {"type": "array", "items": {"type": "string"}}
    },
    "required": ["found_project_page"]
}

# Agent R Definitions
def build_agent_r_goal(rera_no: str = "", project_name: str = "", district_guess: str = "", builder_name: str = "") -> str:
    return (
        f"{SAFETY_PREAMBLE} "
        "Open the section for registered projects (menu may be named 'Services', 'Projects' or "
        "'Registered Projects' / 'Project Search'). "
        + (f"Search by registration number \"{rera_no}\" if provided; " if rera_no else "")
        + f"otherwise search by project name \"{project_name}\" and the district or taluk \"{district_guess}\". "
        f"Open the best matching project's detail page. If more than one candidate matches, open the one whose promoter "
        f"resembles \"{builder_name}\". Extract: registration number, project name, promoter name, project location, "
        f"district, taluk, project status, proposed (declared) date of completion, registration date, and the "
        f"apartment types with their carpet areas. Also report whether you were able to run a search and whether any "
        f"result was found. Return JSON."
    )

AGENT_R_SCHEMA = {
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

# Parsing functions with robust field fallbacks
def parse_agent_l_result(data: Optional[Dict[str, Any]], fallback_url: str = "") -> ListingData:
    if not data:
        return ListingData(blocked=True, blocked_reason="No response received from agent L")
    
    # Handle bare wrapper if nested under result or data
    if "result" in data and isinstance(data["result"], dict):
        data = data["result"]

    return ListingData(
        project_name=data.get("project_name"),
        builder_name=data.get("builder_name"),
        locality=data.get("locality"),
        city=data.get("city"),
        config_bhk=data.get("config_bhk"),
        price_text=data.get("price_text"),
        price_inr=data.get("price_inr"),
        area_value=data.get("area_value"),
        area_unit=data.get("area_unit"),
        area_type=data.get("area_type"),
        possession_text=data.get("possession_text"),
        rera_numbers=data.get("rera_numbers") or [],
        amenities=data.get("amenities") or [],
        listed_by=data.get("listed_by"),
        listing_title=data.get("listing_title"),
        page_url=data.get("page_url") or fallback_url,
        blocked=bool(data.get("blocked", False)),
        blocked_reason=data.get("blocked_reason")
    )

def parse_agent_b_result(data: Optional[Dict[str, Any]], fallback_url: str = "") -> BuilderData:
    if not data:
        return BuilderData(found_project_page=False, blocked=True, blocked_reason="No response from Agent B")
    if "result" in data and isinstance(data["result"], dict):
        data = data["result"]

    configs = []
    for c in data.get("configs") or []:
        if isinstance(c, dict):
            configs.append(BuilderConfig(
                label=c.get("label"),
                area_value=c.get("area_value"),
                area_unit=c.get("area_unit"),
                area_type=c.get("area_type"),
                price_text=c.get("price_text"),
                price_inr=c.get("price_inr")
            ))

    amenities = []
    for a in data.get("amenities") or []:
        if isinstance(a, dict):
            amenities.append(BuilderAmenity(
                name=a.get("name", ""),
                status=a.get("status")
            ))
        elif isinstance(a, str):
            amenities.append(BuilderAmenity(name=a, status="available"))

    return BuilderData(
        site_url=data.get("site_url") or fallback_url,
        page_url=data.get("page_url") or fallback_url,
        project_name=data.get("project_name"),
        developer_name=data.get("developer_name"),
        location_text=data.get("location_text"),
        configs=configs,
        price_from_inr=data.get("price_from_inr"),
        possession_text=data.get("possession_text"),
        status_text=data.get("status_text"),
        amenities=amenities,
        rera_numbers=data.get("rera_numbers") or [],
        found_project_page=bool(data.get("found_project_page", True)),
        blocked=bool(data.get("blocked", False)),
        blocked_reason=data.get("blocked_reason")
    )

def parse_agent_r_result(data: Optional[Dict[str, Any]], fallback_url: str = "https://rera.karnataka.gov.in") -> RERARecord:
    if not data:
        return RERARecord(blocked=True, blocked_reason="No response from Agent R")
    if "result" in data and isinstance(data["result"], dict):
        data = data["result"]

    unit_areas = []
    for u in data.get("unit_areas") or []:
        if isinstance(u, dict):
            unit_areas.append(RERAUnitArea(
                label=u.get("label"),
                carpet_area_text=u.get("carpet_area_text")
            ))

    return RERARecord(
        found=bool(data.get("found", False)),
        search_performed=bool(data.get("search_performed", False)),
        searched_by=data.get("searched_by"),
        page_url=data.get("page_url") or fallback_url,
        registration_no=data.get("registration_no"),
        project_name=data.get("project_name"),
        promoter_name=data.get("promoter_name"),
        location_text=data.get("location_text"),
        district=data.get("district"),
        proposed_completion_text=data.get("proposed_completion_text"),
        registered_on_text=data.get("registered_on_text"),
        status_text=data.get("status_text"),
        unit_areas=unit_areas,
        blocked=bool(data.get("blocked", False)),
        blocked_reason=data.get("blocked_reason")
    )
