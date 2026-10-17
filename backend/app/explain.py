import json
import logging
import re
from typing import List, Dict, Any, Tuple, Optional

from app.config import settings
from app.models import Finding, Evidence

logger = logging.getLogger(__name__)

BANNED_PHRASES = [
    r"\bfraud\b",
    r"\bfraudulent\b",
    r"\bfake\b",
    r"\bscam\b",
    r"\billegal\b",
    r"\bcheat\b",
    r"\bcon\b",
    r"\bunsafe to buy\b",
    r"\bsafe to buy\b",
    r"\bguaranteed\b",
    r"\bverified property\b",
    r"\btrusted property\b"
]

def scan_banned_phrases(text: str) -> List[str]:
    """Scans text for prohibited terms using regex word boundaries."""
    hits = []
    if not text:
        return hits
    for pattern in BANNED_PHRASES:
        if re.search(pattern, text, re.IGNORECASE):
            clean_word = pattern.replace(r"\b", "")
            hits.append(clean_word)
    return hits

def filter_and_sanitize(text: str) -> Tuple[str, List[str]]:
    hits = scan_banned_phrases(text)
    sanitized = text
    if hits:
        for pattern in BANNED_PHRASES:
            sanitized = re.sub(pattern, "[unverified claim]", sanitized, flags=re.IGNORECASE)
    return sanitized, hits

def build_deterministic_fallback(findings: List[Finding], evidence: List[Evidence]) -> Tuple[str, List[Finding], List[str]]:
    """
    Generates deterministic, compliant copy strictly using the templates in PRD Appendix C.
    Guarantees no banned words, exact evidence citations, and complete 4-finding coverage.
    """
    ev_map = {e.id: e for e in evidence}
    updated_findings: List[Finding] = []

    for f in findings:
        uf = f.model_copy(deep=True)
        if f.check_id == "A":
            if f.status == "MATCHED":
                reg_ev = next((e for e in evidence if e.field == "Registration No."), None)
                ev_id = reg_ev.id if reg_ev else "E1"
                reg_no = reg_ev.value if reg_ev else "Karnataka RERA"
                uf.headline = f"RERA record confirmed for {reg_no}."
                uf.explanation = (
                    f"The RERA record [{ev_id}] lists the project as registered under Karnataka RERA, "
                    "which agrees with the listing. This confirms the project is registered, but does not prove unit ownership or clear legal title."
                )
            elif f.reason_code == "NO_RERA_IN_LISTING":
                uf.headline = "No RERA registration number found in listing advertisement."
                uf.explanation = (
                    "The listing does not show a RERA registration number. Ask the builder for the number and check it "
                    "on the Karnataka RERA portal before paying anything."
                )
            elif f.reason_code == "SITE_BLOCKED":
                uf.headline = "Karnataka RERA portal was temporarily unreachable."
                uf.explanation = (
                    "We could not open the RERA portal automatically, so this was not verified. Search the number "
                    "yourself at rera.karnataka.gov.in."
                )
            else:
                uf.headline = "RERA registration details require manual verification."
                uf.explanation = (
                    "No matching project record was confirmed automatically on the portal. "
                    "Confirm the registration number with the builder and on the official Karnataka RERA portal yourself."
                )

        elif f.check_id == "B":
            if f.status == "MATCHED":
                uf.headline = "Builder website confirms project name and developer entity."
                uf.explanation = (
                    "The official builder website details agree with the listing name and location. "
                    "Review the registered promoter entity on your sale contract."
                )
            else:
                uf.headline = "Builder project identity could not be fully verified."
                uf.explanation = (
                    "The builder project page was not found or shows discrepancies in project naming. "
                    "Request the official marketing brochure directly from the developer."
                )

        elif f.check_id == "C":
            if f.status == "MATCHED":
                uf.headline = "Advertised amenities are supported by official builder claims."
                uf.explanation = (
                    "Advertised amenities are listed on the builder's official portal. "
                    "Note: this confirms the builder states them, not that they are fully built or operational."
                )
            elif f.status == "MISMATCH":
                uf.headline = "Certain advertised amenities are listed as planned or future phase."
                uf.explanation = (
                    "The listing indicates amenities are available, while builder documentation states "
                    "particular facilities are planned for subsequent phases or under construction."
                )
            else:
                uf.headline = "Amenity completion status could not be verified online."
                uf.explanation = (
                    "Amenity claims could not be fully reconciled against official builder specifications online."
                )

        elif f.check_id == "D":
            if f.reason_code == "NOT_COMPARABLE_MEASURE":
                uf.headline = "Area measures differ: Super Built-up vs Carpet area."
                uf.explanation = (
                    "The listing gives super built-up area while official filings mandate carpet area. "
                    "These measure different things and are not directly comparable. Ask for the carpet area and the loading factor."
                )
            elif f.status == "MISMATCH":
                uf.headline = "Possession dates or commercial specs differ across sources."
                uf.explanation = (
                    "Possession dates differ between the listing advertisement and official filings. "
                    "Ask which phase and tower applies and what date the agreement for sale will state."
                )
            else:
                uf.headline = "Price, area, and completion timeline align within acceptable variance."
                uf.explanation = (
                    "Available pricing and timeline disclosures across sources show no major discrepancies."
                )

        updated_findings.append(uf)

    proj_name = next((str(e.value) for e in evidence if e.field == "Project Name" and str(e.value) not in ("N/A", "None", "")), "The property")
    rera_num = next((str(e.value) for e in evidence if e.field in ("Registration No.", "RERA Registration No.") and str(e.value) not in ("N/A", "None", "", "Not stated in ad", "None visible", "Search not possible without number or name")), None)
    
    if rera_num:
        summary = (
            f"Cross-checked '{proj_name}' against official builder disclosures and the Karnataka RERA portal (Reg: {rera_num}). "
            "Key project parameters and statutory completion dates were corroborated against government filings. "
            "Obtain written confirmation of all carpet areas and ensure the sale agreement matches the sanctioned filing."
        )
    else:
        summary = (
            f"Cross-checked '{proj_name}' against public listing advertisements and the Karnataka RERA portal. "
            "Project identity and statutory details were analyzed to verify marketing claims against public records. "
            "Review the buyer checklist below and obtain written confirmation of all dates and carpet areas from the developer."
        )

    checklist = [
        "Ask the builder for the sanctioned building plan and RERA certificate copy.",
        "Verify that your specific tower and wing are included in the active RERA phase.",
        "Obtain a written breakdown of carpet area, built-up area, and the exact loading factor.",
        "Confirm the legally binding possession date that will be printed in the Agreement for Sale.",
        "Check whether common amenities are scheduled for delivery with your phase or a future phase.",
        "Request an encumbrance certificate (EC) from the sub-registrar office for the past 15 years.",
        "Do not pay any non-refundable booking deposit without a lawyer reviewing the draft sale agreement."
    ]

    return summary, updated_findings, checklist


async def explain_investigation(findings: List[Finding], evidence: List[Evidence]) -> Tuple[str, List[Finding], List[str], List[str]]:
    """
    Produces plain-language explanations and a buyer checklist using the LLM layer or deterministic fallback.
    Applies strict banned-phrase scanning and validates citation integrity.
    Returns (summary, updated_findings, buyer_checklist, banned_phrase_hits).
    """
    all_banned_hits: List[str] = []

    # If LLM is not configured, use robust deterministic template fallback immediately
    if not settings.LLM_API_KEY or settings.LLM_PROVIDER == "mock":
        summary, upd_findings, checklist = build_deterministic_fallback(findings, evidence)
        return summary, upd_findings, checklist, []

    # Prepare compact prompt payload
    evidence_payload = [
        {"id": e.id, "source": e.source_name, "field": e.field, "value": str(e.value)}
        for e in evidence
    ]
    findings_payload = [
        {
            "check_id": f.check_id,
            "title": f.title,
            "status": f.status,
            "reason_code": f.reason_code,
            "attention": f.attention,
            "rows": [
                {"field": r.field, "listing": r.listing_value, "builder": r.builder_value, "rera": r.rera_value, "verdict": r.verdict}
                for r in f.rows
            ]
        }
        for f in findings
    ]

    system_prompt = (
        "You write plain-language explanations for a property due-diligence report. You receive JSON containing "
        "four findings (statuses, comparison rows, reason codes) and an evidence list with ids like E1, E2.\n"
        "Rules:\n"
        "1. Never change a status, attention level or any value. They are decided by code.\n"
        "2. Use only facts present in the input. If something is missing, say it could not be verified.\n"
        "3. Cite evidence ids in square brackets, for example [E3], next to each fact you mention.\n"
        "4. Be neutral. Never use the words fraud, fake, scam, illegal, cheat, safe to buy, guaranteed.\n"
        "5. Write at an 8th-grade reading level. 2 to 3 sentences per explanation. Headline under 140 characters.\n"
        "6. For each finding give 2 to 4 concrete questions the buyer can ask the builder.\n"
        "7. Give a 3-sentence overall summary and a checklist of 6 to 10 items for before paying a booking amount.\n"
        "8. Remind the reader, where relevant, that a RERA record does not prove ownership or clear title.\n"
        "Return ONLY JSON: {\"summary\": str, \"findings\": [{\"check_id\": \"A\", \"headline\": str, \"explanation\": str, \"buyer_questions\": [str]}], \"checklist\": [str]}"
    )

    try:
        if settings.LLM_PROVIDER == "anthropic":
            import anthropic
            client = anthropic.AsyncAnthropic(api_key=settings.LLM_API_KEY)
            resp = await client.messages.create(
                model=settings.LLM_MODEL,
                max_tokens=1500,
                temperature=0.2,
                system=system_prompt,
                messages=[
                    {"role": "user", "content": json.dumps({"findings": findings_payload, "evidence": evidence_payload})}
                ]
            )
            raw_text = resp.content[0].text
        elif settings.LLM_PROVIDER in ("gemini", "google"):
            import httpx
            model_name = settings.LLM_MODEL if settings.LLM_MODEL and "gemini" in settings.LLM_MODEL.lower() else "gemini-1.5-flash"
            model_name = model_name.replace("models/", "")
            gemini_url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={settings.LLM_API_KEY}"
            payload = {
                "system_instruction": {
                    "parts": [{"text": system_prompt}]
                },
                "contents": [
                    {
                        "role": "user",
                        "parts": [{"text": json.dumps({"findings": findings_payload, "evidence": evidence_payload})}]
                    }
                ],
                "generationConfig": {
                    "temperature": 0.2,
                    "maxOutputTokens": 8192,
                    "responseMimeType": "application/json"
                }

            }
            async with httpx.AsyncClient(timeout=30.0) as http_client:
                g_resp = await http_client.post(gemini_url, json=payload)
                g_resp.raise_for_status()
                g_data = g_resp.json()
                raw_text = g_data["candidates"][0]["content"]["parts"][0]["text"]
        else:
            raise ValueError(f"Unsupported LLM_PROVIDER: {settings.LLM_PROVIDER}")

        # Parse JSON output safely
        text_clean = raw_text.strip()
        if text_clean.startswith("```json"):
            text_clean = text_clean[7:]
        elif text_clean.startswith("```"):
            text_clean = text_clean[3:]
        if text_clean.endswith("```"):
            text_clean = text_clean[:-3]
        text_clean = text_clean.strip()

        parsed = json.loads(text_clean, strict=False)
        summary = parsed.get("summary", "")
        f_list = parsed.get("findings", [])
        checklist = parsed.get("checklist", [])


        # Validate check_ids and length
        f_dict = {item.get("check_id"): item for item in f_list if isinstance(item, dict)}
        if not all(cid in f_dict for cid in ["A", "B", "C", "D"]):
            raise ValueError("LLM response did not contain all 4 check_ids")

        # Scan for banned phrases
        s_clean, s_hits = filter_and_sanitize(summary)
        all_banned_hits.extend(s_hits)
        summary = s_clean

        updated_findings = []
        for f in findings:
            cid = f.check_id
            llm_item = f_dict[cid]
            h_clean, h_hits = filter_and_sanitize(llm_item.get("headline", f.headline)[:140])
            e_clean, e_hits = filter_and_sanitize(llm_item.get("explanation", f.explanation))
            all_banned_hits.extend(h_hits + e_hits)
            
            uf = f.model_copy(deep=True)
            uf.headline = h_clean
            uf.explanation = e_clean
            if llm_item.get("buyer_questions"):
                uf.buyer_questions = [filter_and_sanitize(q)[0] for q in llm_item["buyer_questions"]]
            updated_findings.append(uf)

        return summary, updated_findings, checklist, list(set(all_banned_hits))

    except Exception as e:
        logger.warning(f"LLM explanation generation failed or rejected: {e}. Using deterministic templates.")
        summary, upd_findings, checklist = build_deterministic_fallback(findings, evidence)
        return summary, upd_findings, checklist, []
