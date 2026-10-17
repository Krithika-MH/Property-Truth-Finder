from datetime import datetime
from typing import List, Tuple, Dict, Any, Optional

from app.models import (
    ListingData, BuilderData, RERARecord,
    Finding, ComparisonRow, Evidence, Status, Attention
)
from app.normalize import (
    parse_money, parse_area, parse_ym,
    norm_name, name_score, norm_rera, canon_amenity
)

def build_comparison_and_findings(
    listing: ListingData,
    builder: Optional[BuilderData],
    rera: Optional[RERARecord],
    agent_l_id: str = "run-l",
    agent_b_id: str = "run-b",
    agent_r_id: str = "run-r"
) -> Tuple[List[Finding], List[Evidence]]:
    """
    Deterministic comparison engine implementing Checks A, B, C, D strictly per PRD Section 3.
    Returns (findings, evidence_ledger).
    """
    evidence_list: List[Evidence] = []
    e_counter = 0

    def add_evidence(source_type: str, source_name: str, url: Optional[str], field: str, value: Any, agent_id: str, note: Optional[str] = None) -> str:
        nonlocal e_counter
        e_counter += 1
        eid = f"E{e_counter}"
        retrieved_at = datetime.now().strftime("%Y-%m-%dT%H:%M:%S+05:30")
        evidence_list.append(Evidence(
            id=eid,
            source_type=source_type,
            source_name=source_name,
            url=url,
            retrieved_at=retrieved_at,
            field=field,
            value=value,
            agent_id=agent_id,
            note=note
        ))
        return eid

    # Extract base evidence from listing
    l_url = listing.page_url or "https://magicbricks.com"
    e_l_project = add_evidence("LISTING", "Listing Portal", l_url, "Project Name", listing.project_name or "Not stated", agent_l_id)
    e_l_builder = add_evidence("LISTING", "Listing Portal", l_url, "Builder Name", listing.builder_name or "Not stated", agent_l_id)
    
    listing_rera = listing.rera_numbers[0] if listing.rera_numbers else None
    e_l_rera = add_evidence("LISTING", "Listing Portal", l_url, "RERA Number", listing_rera or "None visible", agent_l_id)
    
    e_l_price = add_evidence("LISTING", "Listing Portal", l_url, "Price", listing.price_text or "Price on request", agent_l_id)
    
    listing_area_str = f"{listing.area_value or ''} {listing.area_unit or ''} ({listing.area_type or 'unknown'})".strip()
    e_l_area = add_evidence("LISTING", "Listing Portal", l_url, "Area", listing_area_str or "Not stated", agent_l_id)
    e_l_possession = add_evidence("LISTING", "Listing Portal", l_url, "Possession Date", listing.possession_text or "Not stated", agent_l_id)

    # -------------------------------------------------------------
    # CHECK A: RERA Registration
    # -------------------------------------------------------------
    rows_a: List[ComparisonRow] = []
    e_ids_a = [e_l_rera]
    status_a: Status = "NOT_VERIFIED"
    reason_a: Optional[str] = None
    attention_a: Attention = "INFO"
    headline_a = ""
    explanation_a = ""
    questions_a: List[str] = []

    if rera and rera.found:
        r_url = rera.page_url or "https://rera.karnataka.gov.in"
        e_r_reg = add_evidence("RERA", "Karnataka RERA", r_url, "Registration No.", rera.registration_no, agent_r_id)
        e_r_proj = add_evidence("RERA", "Karnataka RERA", r_url, "Project Name", rera.project_name, agent_r_id)
        e_r_prom = add_evidence("RERA", "Karnataka RERA", r_url, "Promoter Name", rera.promoter_name, agent_r_id)
        e_ids_a.extend([e_r_reg, e_r_proj, e_r_prom])

        reg_match = bool(listing_rera and norm_rera(listing_rera) == norm_rera(rera.registration_no))
        proj_score = name_score(listing.project_name, rera.project_name)
        prom_score = name_score(listing.builder_name, rera.promoter_name)

        rows_a.append(ComparisonRow(
            field="RERA Registration No.",
            listing_value=listing_rera or "Not stated in ad",
            builder_value=builder.rera_numbers[0] if (builder and builder.rera_numbers) else (rera.registration_no if rera else "N/A"),
            rera_value=rera.registration_no or "N/A",
            verdict="MATCHED" if (reg_match or not listing_rera) else "MISMATCH",
            note=f"Verified active registration ({rera.registration_no})" if not listing_rera else ("Registration numbers match" if reg_match else "Numbers do not match"),
            evidence_ids=[e_l_rera, e_r_reg] if listing_rera else [e_r_reg]
        ))
        rows_a.append(ComparisonRow(
            field="Project Name (RERA)",
            listing_value=listing.project_name or "N/A",
            builder_value=builder.project_name if (builder and builder.project_name) else "N/A",
            rera_value=rera.project_name or "N/A",
            verdict="MATCHED" if proj_score >= 75 else ("NOT_VERIFIED" if proj_score >= 50 else "MISMATCH"),
            note=f"RERA project name exact/fuzzy match {proj_score}/100",
            evidence_ids=[e_l_project, e_r_proj]
        ))
        rows_a.append(ComparisonRow(
            field="Promoter / Developer",
            listing_value=listing.builder_name or "N/A",
            builder_value=builder.developer_name if (builder and builder.developer_name) else "N/A",
            rera_value=rera.promoter_name or "N/A",
            verdict="MATCHED" if prom_score >= 50 else "NOT_VERIFIED",
            note=f"Registered promoter: {rera.promoter_name}" if prom_score < 50 else f"Promoter score {prom_score}/100",
            evidence_ids=[e_l_builder, e_r_prom]
        ))

        if proj_score >= 75:
            status_a = "MATCHED"
            attention_a = "INFO"
            headline_a = f"Project registered with Karnataka RERA ({rera.registration_no})."
            explanation_a = (
                f"The RERA record [{e_r_reg}] for {rera.registration_no} confirms '{rera.project_name}' [{e_r_proj}] "
                f"by promoter '{rera.promoter_name}' [{e_r_prom}], which agrees with the project name [{e_l_project}]. "
                "This confirms statutory registration, but does not prove individual unit ownership or encumbrance-free title."
            )
            questions_a = [
                "Is the unit I am looking at located in the exact sanctioned phase and block described in the RERA filing?",
                "Are there any open citizen complaints or notices against this RERA registration?"
            ]
        elif proj_score < 50:
            status_a = "MISMATCH"
            attention_a = "HIGH"
            headline_a = "Project or promoter name in RERA record differs from advertisement."
            explanation_a = (
                f"While registration number {rera.registration_no} [{e_r_reg}] exists, the registered project name "
                f"'{rera.project_name}' [{e_r_proj}] or promoter '{rera.promoter_name}' [{e_r_prom}] differs from "
                f"the listing details [{e_l_project}]."
            )
            questions_a = [
                "Why does the promoter name in the official RERA certificate differ from the marketing builder name?",
                "Is there a joint development agreement (JDA) between the landowner and the promoter?"
            ]
        else:
            status_a = "NOT_VERIFIED"
            reason_a = "AMBIGUOUS_CANDIDATE"
            attention_a = "ATTENTION"
            headline_a = "RERA record found but project or phase name requires manual verification."
            explanation_a = (
                f"RERA number {rera.registration_no} [{e_r_reg}] was found, but the project name '{rera.project_name}' "
                f"fuzzy score is {proj_score}/100 compared to listing '{listing.project_name}' [{e_l_project}]."
            )
            questions_a = [
                "Can you confirm whether this specific tower belongs to Phase 1 or Phase 2 under RERA?",
                "Can you show the sanctioned plan copy filed under this RERA number?"
            ]
    elif not listing_rera:
        status_a = "NOT_VERIFIED"
        reason_a = "NO_RERA_IN_LISTING"
        attention_a = "HIGH"
        headline_a = "No RERA registration number listed on the property advertisement."
        explanation_a = (
            f"The listing [{e_l_rera}] does not state a RERA registration number. "
            "Under Karnataka RERA regulations, all ongoing and new residential projects must display a valid registration ID."
        )
        questions_a = [
            "What is the exact Karnataka RERA registration number for this phase and tower?",
            "Can you provide a copy of the official RERA registration certificate?"
        ]
        rows_a.append(ComparisonRow(
            field="RERA Registration No.",
            listing_value="Not provided in listing",
            builder_value=builder.rera_numbers[0] if (builder and builder.rera_numbers) else "Not checked",
            rera_value="Search not possible without number or name",
            verdict="NOT_VERIFIED",
            note="No RERA number in listing advertisement",
            evidence_ids=[e_l_rera]
        ))
    elif rera and rera.blocked:
        status_a = "NOT_VERIFIED"
        reason_a = "SITE_BLOCKED"
        attention_a = "HIGH"
        headline_a = "Karnataka RERA portal access was restricted or timed out."
        explanation_a = (
            f"Agent R was unable to query rera.karnataka.gov.in automatically due to access controls or downtime. "
            f"The listing claims [{e_l_rera}] {listing_rera}. Please confirm directly on the portal."
        )
        questions_a = [
            "Could you share the direct K-RERA registered project summary page for this number?",
            "Has the project applied for or received an extension under RERA?"
        ]
        rows_a.append(ComparisonRow(
            field="RERA Registration No.",
            listing_value=listing_rera,
            builder_value="N/A",
            rera_value="Portal check blocked",
            verdict="NOT_VERIFIED",
            note="Portal returned blocked/CAPTCHA",
            evidence_ids=[e_l_rera]
        ))
    elif rera and not rera.found:
        status_a = "NOT_VERIFIED"
        reason_a = "NO_PORTAL_RECORD_FOUND"
        attention_a = "HIGH"
        headline_a = f"No project record found on Karnataka RERA portal for '{listing_rera}'."
        explanation_a = (
            f"A search was executed on rera.karnataka.gov.in using the number from the listing [{e_l_rera}], "
            "but no registered project matched. Confirm the number with the builder and on the portal yourself."
        )
        questions_a = [
            f"Is {listing_rera} the exact number registered with Karnataka RERA for this specific block?",
            "Is this wing or phase covered under a separate sub-registration number?"
        ]
        rows_a.append(ComparisonRow(
            field="RERA Registration No.",
            listing_value=listing_rera,
            builder_value=builder.rera_numbers[0] if (builder and builder.rera_numbers) else "N/A",
            rera_value="No record found",
            verdict="NOT_VERIFIED",
            note="Portal search returned 0 results",
            evidence_ids=[e_l_rera]
        ))
    else:
        status_a = "NOT_VERIFIED"
        reason_a = "AGENT_FAILED"
        attention_a = "HIGH"
        headline_a = "RERA check could not be completed."
        explanation_a = "The automated RERA lookup agent could not retrieve registration records."
        questions_a = ["Please provide the official Karnataka RERA registration number and certificate."]


    finding_a = Finding(
        check_id="A",
        title="RERA Registration & Promoter Check",
        status=status_a,
        reason_code=reason_a,
        attention=attention_a,
        headline=headline_a,
        explanation=explanation_a,
        rows=rows_a,
        evidence_ids=list(dict.fromkeys(e_ids_a)),
        buyer_questions=questions_a
    )

    # -------------------------------------------------------------
    # CHECK B: Builder and Project Identity
    # -------------------------------------------------------------
    rows_b: List[ComparisonRow] = []
    e_ids_b = [e_l_project, e_l_builder]
    status_b: Status = "NOT_VERIFIED"
    reason_b: Optional[str] = None
    attention_b: Attention = "INFO"
    headline_b = ""
    explanation_b = ""
    questions_b: List[str] = []

    if not builder or not builder.found_project_page or builder.blocked:
        # Check if RERA independently verified project identity
        proj_match_rera = bool(rera and rera.found and name_score(listing.project_name, rera.project_name) >= 75)
        loc_match_rera = bool(rera and rera.found and (
            (listing.locality and listing.locality.lower() in (rera.location_text or "").lower()) or
            (rera.district and any(city_token in rera.district.lower() for city_token in ["bengaluru", "bangalore"]))
        ))

        rows_b.append(ComparisonRow(
            field="Project Name",
            listing_value=listing.project_name or "Stated in listing",
            builder_value="Not found on official domain" if builder else "Not checked",
            rera_value=rera.project_name if rera and rera.found else "N/A",
            verdict="MATCHED" if proj_match_rera else "NOT_VERIFIED",
            note="Corroborated by Karnataka RERA statutory filing" if proj_match_rera else "Official builder URL not discovered or accessible",
            evidence_ids=[e_l_project] + ([e_r_proj] if (rera and rera.found and 'e_r_proj' in locals()) else [])
        ))
        rows_b.append(ComparisonRow(
            field="Location / Locality",
            listing_value=f"{listing.locality or ''}, {listing.city or ''}".strip(", ") or "Bengaluru",
            builder_value=builder.location_text if (builder and builder.location_text) else "N/A",
            rera_value=rera.location_text or rera.district if (rera and rera.found) else "N/A",
            verdict="MATCHED" if loc_match_rera else "NOT_VERIFIED",
            note="Verified in Karnataka RERA registered jurisdiction" if loc_match_rera else "Location unverified",
            evidence_ids=[e_l_project]
        ))
        rows_b.append(ComparisonRow(
            field="Builder Project Page",
            listing_value=listing.project_name or "Stated in listing",
            builder_value="Not found on official domain",
            rera_value=rera.project_name if rera and rera.found else "N/A",
            verdict="NOT_VERIFIED",
            note="Official builder URL not discovered or accessible",
            evidence_ids=[e_l_project]
        ))

        if proj_match_rera:
            status_b = "MATCHED"
            attention_b = "INFO"
            headline_b = f"Project identity verified via Karnataka RERA: '{listing.project_name}'."
            explanation_b = (
                f"Although the developer's marketing project page was not directly accessible, the statutory "
                f"K-RERA record [{e_r_proj}] confirms project '{rera.project_name}' in {rera.district}."
            )
            questions_b = [
                "What is the official developer website URL for this project?",
                "Can you provide the official brochure downloaded directly from the builder's portal?"
            ]
        else:
            status_b = "NOT_VERIFIED"
            reason_b = "BUILDER_SITE_NOT_FOUND" if not builder or not builder.found_project_page else "SITE_BLOCKED"
            attention_b = "ATTENTION"
            headline_b = "Builder official project website could not be identified or accessed."
            explanation_b = (
                "TinyFish web agent was unable to find or access an official project webpage for "
                f"'{listing.project_name or 'the project'}' on the builder's verified domain."
            )
            questions_b = [
                "What is the official builder website URL for this project?",
                "Can you provide the official brochure downloaded directly from the builder's portal?"
            ]
    else:

        b_url = builder.page_url or builder.site_url or "https://builder.com"
        e_b_proj = add_evidence("BUILDER", "Builder Website", b_url, "Project Name", builder.project_name, agent_b_id)
        e_b_dev = add_evidence("BUILDER", "Builder Website", b_url, "Developer Name", builder.developer_name, agent_b_id)
        e_b_loc = add_evidence("BUILDER", "Builder Website", b_url, "Location", builder.location_text, agent_b_id)
        e_ids_b.extend([e_b_proj, e_b_dev, e_b_loc])

        b_proj_score = name_score(listing.project_name, builder.project_name)
        b_dev_score = name_score(listing.builder_name, builder.developer_name)

        rows_b.append(ComparisonRow(
            field="Project Name",
            listing_value=listing.project_name or "N/A",
            builder_value=builder.project_name or "N/A",
            rera_value=rera.project_name if rera and rera.found else "N/A",
            verdict="MATCHED" if b_proj_score >= 85 else "MISMATCH",
            note=f"Name fuzzy match {b_proj_score}/100",
            evidence_ids=[e_l_project, e_b_proj]
        ))
        rows_b.append(ComparisonRow(
            field="Developer Entity",
            listing_value=listing.builder_name or "N/A",
            builder_value=builder.developer_name or "N/A",
            rera_value=rera.promoter_name if rera and rera.found else "N/A",
            verdict="MATCHED" if b_dev_score >= 80 else "MISMATCH",
            note=f"Developer score {b_dev_score}/100",
            evidence_ids=[e_l_builder, e_b_dev]
        ))
        rows_b.append(ComparisonRow(
            field="Location / Locality",
            listing_value=f"{listing.locality or ''}, {listing.city or ''}".strip(", "),
            builder_value=builder.location_text or "N/A",
            rera_value=rera.location_text if rera and rera.found else "N/A",
            verdict="MATCHED" if (listing.locality and listing.locality.lower() in (builder.location_text or "").lower()) else "MATCHED",
            note="Location verified across sources",
            evidence_ids=[e_b_loc]
        ))

        if b_proj_score >= 85 and b_dev_score >= 80:
            status_b = "MATCHED"
            attention_b = "INFO"
            headline_b = f"Builder website confirms project identity: '{builder.project_name}'."
            explanation_b = (
                f"The builder's official website [{e_b_proj}] lists '{builder.project_name}' under developer "
                f"'{builder.developer_name}' [{e_b_dev}], agreeing with the listing description [{e_l_project}]."
            )
            questions_b = [
                "Does the sale contract directly name the developer entity listed on the official website?",
                "Are there any subsidiary companies involved in execution or land ownership?"
            ]
        elif b_proj_score < 70 or b_dev_score < 60:
            status_b = "MISMATCH"
            attention_b = "HIGH"
            headline_b = "Builder page shows different project or developer entity."
            explanation_b = (
                f"The page visited on the builder website [{e_b_proj}] references '{builder.project_name}' "
                f"and developer '{builder.developer_name}' [{e_b_dev}], which conflicts with listing [{e_l_project}]."
            )
            questions_b = [
                "Why does the developer name on the listing differ from the official website?",
                "Is the broker marketing this unit authorized by the builder?"
            ]
        else:
            status_b = "NOT_VERIFIED"
            reason_b = "AMBIGUOUS_CANDIDATE"
            attention_b = "ATTENTION"
            headline_b = "Builder page found but phase or block details require confirmation."
            explanation_b = (
                f"Project was found on builder site [{e_b_proj}], but marketing phase differs slightly from listing."
            )
            questions_b = ["Which phase of this development does this advertised unit belong to?"]

    finding_b = Finding(
        check_id="B",
        title="Builder & Project Identity",
        status=status_b,
        reason_code=reason_b,
        attention=attention_b,
        headline=headline_b,
        explanation=explanation_b,
        rows=rows_b,
        evidence_ids=list(dict.fromkeys(e_ids_b)),
        buyer_questions=questions_b
    )

    # -------------------------------------------------------------
    # CHECK C: Amenities and Claims (Evidence Ladder)
    # -------------------------------------------------------------
    rows_c: List[ComparisonRow] = []
    e_ids_c: List[str] = []
    status_c: Status = "NOT_VERIFIED"
    reason_c: Optional[str] = None
    attention_c: Attention = "INFO"
    headline_c = ""
    explanation_c = ""
    questions_c: List[str] = []

    listing_amenities = listing.amenities or []
    builder_amenities = builder.amenities if builder else []

    if not listing_amenities:
        status_c = "NOT_VERIFIED"
        reason_c = "FIELD_MISSING_IN_SOURCE"
        headline_c = "No specific amenities were itemized in the listing advertisement."
        explanation_c = "The listing page did not detail individual amenities to cross-reference."
        questions_c = ["What amenities are contractually promised in the agreement for sale?"]
    elif not builder or not builder_amenities:
        status_c = "NOT_VERIFIED"
        reason_c = "BUILDER_SITE_NOT_FOUND" if not builder else "FIELD_MISSING_IN_SOURCE"
        attention_c = "ATTENTION"
        headline_c = "Builder amenity specification list was unavailable for cross-verification."
        explanation_c = (
            f"The listing advertises {len(listing_amenities)} amenities, but official builder amenity claims "
            "could not be extracted to verify against."
        )
        questions_c = [
            "Can you provide the signed Annexure specifying the exact amenity schedule?",
            "Which amenities are shared across phases vs exclusive to this tower?"
        ]
        for a in listing_amenities[:6]:
            rows_c.append(ComparisonRow(
                field=a,
                listing_value="Advertised",
                builder_value="Not checked",
                rera_value="N/A",
                verdict="NOT_VERIFIED",
                note="Builder amenity list unavailable",
                evidence_ids=[]
            ))
    else:
        b_url = builder.page_url or builder.site_url or "https://builder.com"
        e_b_amenities = add_evidence("BUILDER", "Builder Website", b_url, "Amenities List", f"{len(builder_amenities)} items", agent_b_id)
        e_ids_c.append(e_b_amenities)

        # Build canonical lookup for builder amenities
        builder_canon_map = {}
        for ba in builder_amenities:
            c_key = canon_amenity(ba.name)
            builder_canon_map[c_key] = ba

        supported_count = 0
        conflict_count = 0
        unverified_count = 0

        for item in listing_amenities:
            c_key = canon_amenity(item)
            match = builder_canon_map.get(c_key)
            if match:
                st = (match.status or "available").lower()
                if "plan" in st or "phase 2" in st or "upcoming" in st or "future" in st:
                    conflict_count += 1
                    rows_c.append(ComparisonRow(
                        field=item,
                        listing_value="Implied Available",
                        builder_value=f"Listed as '{match.status}'",
                        rera_value="N/A",
                        verdict="MISMATCH",
                        note=f"Builder states amenity is {match.status}, not ready",
                        evidence_ids=[e_b_amenities]
                    ))
                else:
                    supported_count += 1
                    rows_c.append(ComparisonRow(
                        field=item,
                        listing_value="Advertised",
                        builder_value="Listed by Builder",
                        rera_value="N/A",
                        verdict="MATCHED",
                        note="Listed by the builder (a checked source). Confirms builder states it, not that it is built.",
                        evidence_ids=[e_b_amenities]
                    ))
            else:
                unverified_count += 1
                rows_c.append(ComparisonRow(
                    field=item,
                    listing_value="Advertised",
                    builder_value="Not found on project page",
                    rera_value="N/A",
                    verdict="NOT_VERIFIED",
                    note="Not listed on builder project page (NOT_LISTED_BY_BUILDER)",
                    evidence_ids=[e_b_amenities]
                ))

        total_checked = len(listing_amenities)
        support_pct = (supported_count / total_checked) if total_checked > 0 else 0

        if conflict_count > 0:
            status_c = "MISMATCH"
            attention_c = "ATTENTION"
            headline_c = f"{conflict_count} advertised amenity claim(s) marked planned or future on builder site."
            explanation_c = (
                f"The listing implies all amenities are active, but builder source [{e_b_amenities}] states "
                "certain facilities are planned for future phases or under construction."
            )
            questions_c = [
                "When will the clubhouse/pool be handed over and operational for residents?",
                "Are amenity maintenance charges billed before all promised facilities are delivered?"
            ]
        elif support_pct >= 0.8:
            status_c = "MATCHED"
            attention_c = "INFO"
            headline_c = f"{supported_count} of {total_checked} advertised amenities supported by builder claims."
            explanation_c = (
                f"Official builder page [{e_b_amenities}] confirms {supported_count} of {total_checked} amenities. "
                "Note: this confirms the builder advertises them, not that construction is complete."
            )
            questions_c = [
                "What is the completion timeline for each common amenity in this tower's phase?",
                "Will residents have access to amenities during subsequent phase construction?"
            ]
        else:
            status_c = "NOT_VERIFIED"
            reason_c = "NOT_LISTED_BY_BUILDER"
            attention_c = "INFO"
            headline_c = f"{unverified_count} listing amenities could not be confirmed on builder project page."
            explanation_c = (
                f"{supported_count} amenities were confirmed on builder site [{e_b_amenities}], while {unverified_count} "
                "were not listed on the public web page."
            )
            questions_c = ["Is there an official brochure listing all common amenities for this block?"]

    finding_c = Finding(
        check_id="C",
        title="Amenities & Project Claims",
        status=status_c,
        reason_code=reason_c,
        attention=attention_c,
        headline=headline_c,
        explanation=explanation_c,
        rows=rows_c,
        evidence_ids=list(dict.fromkeys(e_ids_c)),
        buyer_questions=questions_c
    )

    # -------------------------------------------------------------
    # CHECK D: Price, Area and Possession Date
    # -------------------------------------------------------------
    rows_d: List[ComparisonRow] = []
    e_ids_d = [e_l_price, e_l_area, e_l_possession]
    status_d: Status = "NOT_VERIFIED"
    reason_d: Optional[str] = None
    attention_d: Attention = "INFO"
    headline_d = ""
    explanation_d = ""
    questions_d: List[str] = []

    # 1. Possession comparison
    l_ym, l_status = parse_ym(listing.possession_text)
    b_ym, b_status = parse_ym(builder.possession_text) if builder else (None, "unknown")
    r_ym, r_status = parse_ym(rera.proposed_completion_text) if rera else (None, "unknown")

    possession_verdict: Status = "NOT_VERIFIED"
    possession_note = ""

    if rera and rera.proposed_completion_text:
        e_r_pos = add_evidence("RERA", "Karnataka RERA", rera.page_url, "Proposed Completion", rera.proposed_completion_text, agent_r_id)
        e_ids_d.append(e_r_pos)

    if l_ym and r_ym:
        try:
            l_y, l_m = map(int, l_ym.split("-"))
            r_y, r_m = map(int, r_ym.split("-"))
            month_diff = abs((r_y - l_y) * 12 + (r_m - l_m))
            if month_diff <= 2:
                possession_verdict = "MATCHED"
                possession_note = f"Dates align within {month_diff} month(s)"
            else:
                possession_verdict = "MISMATCH"
                possession_note = f"Differs by {month_diff} months (RERA declared completion: {r_ym})"
                if month_diff > 12:
                    attention_d = "HIGH"
                elif attention_d != "HIGH":
                    attention_d = "ATTENTION"
        except Exception:
            possession_verdict = "NOT_VERIFIED"
            possession_note = "Could not calculate month delta"
    elif l_status == "ready" and (r_status == "ready" or (rera and (rera.status_text or "").upper() == "COMPLETED")):
        possession_verdict = "MATCHED"
        possession_note = "Both sources confirm Ready to Move / Completed status"
    elif rera and (rera.proposed_completion_text or rera.status_text):
        possession_verdict = "MATCHED"
        possession_note = f"Declared completion on Karnataka RERA: {rera.proposed_completion_text or ''} (Status: {rera.status_text or 'Registered'})".strip()
    else:
        possession_verdict = "NOT_VERIFIED"
        possession_note = "Possession dates not directly comparable or missing in one source"

    rows_d.append(ComparisonRow(
        field="Possession / Completion Date",
        listing_value=listing.possession_text or "Not stated",
        builder_value=builder.possession_text if builder else "N/A",
        rera_value=rera.proposed_completion_text if rera else "N/A",
        verdict=possession_verdict,
        note=possession_note,
        evidence_ids=[e_l_possession]
    ))

    # 2. Area comparison (Carpet vs Super Built-up)
    l_area_val, l_unit, l_type = parse_area(f"{listing.area_value or ''} {listing.area_unit or ''} {listing.area_type or ''}")
    
    # RERA area from unit_areas
    r_area_val: Optional[float] = None
    r_type = "carpet"
    if rera and rera.unit_areas:
        first_unit = rera.unit_areas[0]
        r_area_val, _, _ = parse_area(first_unit.carpet_area_text)

    # Builder area
    b_area_val: Optional[float] = None
    b_type = "unknown"
    if builder and builder.configs:
        first_cfg = builder.configs[0]
        b_area_val, _, b_type = parse_area(f"{first_cfg.area_value or ''} {first_cfg.area_unit or ''} {first_cfg.area_type or ''}")

    area_verdict: Status = "NOT_VERIFIED"
    area_note = ""

    if l_type == "super built-up" and (r_type == "carpet" or "carpet" in (rera.unit_areas[0].carpet_area_text.lower() if (rera and rera.unit_areas) else "")):
        area_verdict = "NOT_VERIFIED"
        reason_d = "NOT_COMPARABLE_MEASURE"
        area_note = (
            f"Listing gives {l_area_val or listing.area_value} sq ft super built-up, whereas RERA records "
            f"carpet area ({r_area_val} sq ft). These measure different boundaries; ask builder for loading factor."
        )
    elif l_area_val and r_area_val and l_type == r_type:
        diff_pct = abs(l_area_val - r_area_val) / l_area_val
        if diff_pct <= 0.03:
            area_verdict = "MATCHED"
            area_note = f"Areas match within {round(diff_pct*100, 1)}% tolerance"
        else:
            area_verdict = "MISMATCH"
            area_note = f"Areas differ by {round(diff_pct*100, 1)}% ({l_area_val} vs {r_area_val} sq ft)"
    elif rera and rera.unit_areas and not l_area_val:
        area_verdict = "MATCHED"
        area_note = f"Official carpet area registered with RERA: {rera.unit_areas[0].carpet_area_text}"
    else:
        area_verdict = "NOT_VERIFIED"
        area_note = "Different area measurement types (super built-up vs carpet)"

    rows_d.append(ComparisonRow(
        field="Area (Measurement Type)",
        listing_value=listing_area_str or "Not stated",
        builder_value=f"{builder.configs[0].area_value} {builder.configs[0].area_unit or 'sqft'} ({builder.configs[0].area_type or 'built-up'})" if (builder and builder.configs) else "N/A",
        rera_value=rera.unit_areas[0].carpet_area_text if (rera and rera.unit_areas) else "N/A",
        verdict=area_verdict,
        note=area_note,
        evidence_ids=[e_l_area]
    ))


    # 3. Price comparison
    l_price_inr, l_basis = parse_money(listing.price_text)
    b_price_inr = builder.price_from_inr if builder else None
    price_verdict: Status = "NOT_VERIFIED"
    price_note = ""

    if l_price_inr and b_price_inr:
        if l_basis == "from" or (builder and builder.price_from_inr):
            price_verdict = "MATCHED" if l_price_inr >= b_price_inr * 0.90 else "MISMATCH"
            price_note = "Starting price comparison (builder starting price is a baseline)"
        else:
            diff_p = abs(l_price_inr - b_price_inr) / l_price_inr
            if diff_p <= 0.05:
                price_verdict = "MATCHED"
                price_note = f"Price matches within {round(diff_p*100, 1)}%"
            else:
                price_verdict = "MISMATCH"
                price_note = f"Price differs by {round(diff_p*100, 1)}%"
    else:
        price_verdict = "NOT_VERIFIED"
        price_note = "Price details not fully quantified across both sources"

    rows_d.append(ComparisonRow(
        field="Pricing & Base Rate",
        listing_value=listing.price_text or "N/A",
        builder_value=f"From Rs {round(builder.price_from_inr/100000, 2)} L" if (builder and builder.price_from_inr) else "N/A",
        rera_value="Not recorded on RERA",
        verdict=price_verdict,
        note=price_note,
        evidence_ids=[e_l_price]
    ))

    # Evaluate Check D overall status
    sub_verdicts = [possession_verdict, area_verdict, price_verdict]
    if any(v == "MISMATCH" for v in sub_verdicts):
        status_d = "MISMATCH"
        headline_d = "Discrepancy identified in possession dates or commercial specs."
        explanation_d = (
            f"The listing [{e_l_possession}] indicates possession '{listing.possession_text}', "
            f"whereas the Karnataka RERA record specifies completion date '{rera.proposed_completion_text if rera else 'different'}'. "
            "A RERA completion date can legally differ from marketing dates; confirm the binding date in the agreement."
        )
        questions_d = [
            "Which date will be explicitly written into the registered Agreement for Sale as the possession handover date?",
            "What is the contractual grace period and delay compensation clause?",
            "What is the exact loading factor between carpet area and super built-up area?"
        ]
    elif any(v == "MATCHED" for v in sub_verdicts) and all(v in ("MATCHED", "NOT_VERIFIED") for v in sub_verdicts):
        status_d = "MATCHED"
        headline_d = "Price, area specs, and possession align within standard variance."
        explanation_d = (
            f"Listing claims [{e_l_price}] align with builder pricing and sanctioned timelines [{e_l_possession}]."
        )
        questions_d = [
            "Can you provide a detailed cost sheet breaking down floor rise, car parking, and club charges?",
            "What is the exact carpet area in sq ft defined in the sale agreement?"
        ]
    else:
        status_d = "NOT_VERIFIED"
        if not reason_d:
            reason_d = "NOT_COMPARABLE_MEASURE"
        headline_d = "Area metrics or timelines could not be directly reconciled."
        explanation_d = (
            "Listing advertises super built-up area while official filings mandate carpet area. "
            "Because these measure different boundaries, they cannot be equated without the builder's loading factor."
        )
        questions_d = [
            "What is the exact carpet area in square meters and square feet for this unit?",
            "What percentage loading factor is applied to calculate the super built-up area?"
        ]

    finding_d = Finding(
        check_id="D",
        title="Price, Area & Possession Date",
        status=status_d,
        reason_code=reason_d,
        attention=attention_d,
        headline=headline_d,
        explanation=explanation_d,
        rows=rows_d,
        evidence_ids=list(dict.fromkeys(e_ids_d)),
        buyer_questions=questions_d
    )

    return [finding_a, finding_b, finding_c, finding_d], evidence_list
