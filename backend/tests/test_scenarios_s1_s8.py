import pytest
from app.models import ListingData, BuilderData, BuilderConfig, BuilderAmenity, RERARecord, RERAUnitArea
from app.compare import build_comparison_and_findings
from app.explain import explain_investigation, build_deterministic_fallback

@pytest.mark.asyncio
async def test_scenario_s1_clean_listing():
    """S1: Clean listing: all three sources return data. Four findings with evidence; coverage above 50%"""
    listing = ListingData(
        project_name="Brigade Cosmopolis",
        builder_name="Brigade Enterprises",
        locality="Whitefield",
        city="Bangalore",
        price_text="Rs 1.25 Cr",
        area_value=1150,
        area_unit="sq ft",
        area_type="super built-up",
        possession_text="Dec 2027",
        rera_numbers=["PRM/KA/RERA/1251/446/PR/171015/000456"],
        amenities=["Gymnasium", "Swimming Pool", "Clubhouse", "24x7 Security"]
    )
    builder = BuilderData(
        found_project_page=True,
        project_name="Brigade Cosmopolis",
        developer_name="Brigade Enterprises Limited",
        location_text="Whitefield, Bangalore",
        price_from_inr=12200000,
        possession_text="Dec 2027",
        amenities=[
            BuilderAmenity(name="Gymnasium", status="available"),
            BuilderAmenity(name="Swimming Pool", status="available"),
            BuilderAmenity(name="Clubhouse", status="available"),
            BuilderAmenity(name="24x7 Security", status="available")
        ],
        rera_numbers=["PRM/KA/RERA/1251/446/PR/171015/000456"]
    )
    rera = RERARecord(
        found=True,
        search_performed=True,
        registration_no="PRM/KA/RERA/1251/446/PR/171015/000456",
        project_name="Brigade Cosmopolis Phase 1",
        promoter_name="Brigade Enterprises Limited",
        location_text="Whitefield, Bengaluru",
        proposed_completion_text="31-12-2027",
        status_text="APPROVED"
    )

    findings, evidence = build_comparison_and_findings(listing, builder, rera)
    assert len(findings) == 4
    assert len(evidence) >= 8

    finding_a = next(f for f in findings if f.check_id == "A")
    assert finding_a.status == "MATCHED"

    finding_b = next(f for f in findings if f.check_id == "B")
    assert finding_b.status == "MATCHED"

    finding_c = next(f for f in findings if f.check_id == "C")
    assert finding_c.status == "MATCHED"

@pytest.mark.asyncio
async def test_scenario_s2_no_rera_in_listing():
    """S2: Listing has no RERA number. Check A NOT_VERIFIED (NO_RERA_IN_LISTING, HIGH); checklist leads with asking for number"""
    listing = ListingData(
        project_name="Greenfield Meadows",
        builder_name="Local Builder",
        rera_numbers=[]
    )
    findings, evidence = build_comparison_and_findings(listing, None, None)
    finding_a = next(f for f in findings if f.check_id == "A")
    assert finding_a.status == "NOT_VERIFIED"
    assert finding_a.reason_code == "NO_RERA_IN_LISTING"
    assert finding_a.attention == "HIGH"
    assert any("rera" in q.lower() for q in finding_a.buyer_questions)

@pytest.mark.asyncio
async def test_scenario_s3_rera_portal_blocked():
    """S3: RERA portal blocked or CAPTCHA. Agent R failure; Check A NOT_VERIFIED SITE_BLOCKED with manual link; report still renders"""
    listing = ListingData(
        project_name="Brigade Cosmopolis",
        rera_numbers=["PRM/KA/RERA/1251/446/PR/171015/000456"]
    )
    rera = RERARecord(blocked=True, blocked_reason="Access restricted by Cloudflare")
    findings, evidence = build_comparison_and_findings(listing, None, rera)
    finding_a = next(f for f in findings if f.check_id == "A")
    assert finding_a.status == "NOT_VERIFIED"
    assert finding_a.reason_code == "SITE_BLOCKED"
    assert "rera.karnataka.gov.in" in finding_a.explanation

@pytest.mark.asyncio
async def test_scenario_s4_possession_dates_conflict():
    """S4: Possession dates conflict. Check D MISMATCH with both links and a neutral explanation"""
    listing = ListingData(
        project_name="Sobha Dream Acres",
        possession_text="Dec 2027",
        rera_numbers=["PRM/KA/RERA/1251/446/PR/171015/000456"]
    )
    rera = RERARecord(
        found=True,
        search_performed=True,
        registration_no="PRM/KA/RERA/1251/446/PR/171015/000456",
        project_name="Sobha Dream Acres",
        promoter_name="Sobha Limited",
        proposed_completion_text="30-06-2029" # 18 months difference
    )
    findings, evidence = build_comparison_and_findings(listing, None, rera)
    finding_d = next(f for f in findings if f.check_id == "D")
    assert finding_d.status == "MISMATCH"
    assert finding_d.attention in ("ATTENTION", "HIGH")
    assert "differ" in finding_d.explanation.lower()

@pytest.mark.asyncio
async def test_scenario_s5_area_types_differ():
    """S5: Area types differ (carpet vs super built-up). NOT_COMPARABLE_MEASURE note; no false mismatch"""
    listing = ListingData(
        project_name="Prestige Park",
        area_value=1200,
        area_unit="sqft",
        area_type="super built-up"
    )
    rera = RERARecord(
        found=True,
        search_performed=True,
        unit_areas=[RERAUnitArea(label="2 BHK", carpet_area_text="68.2 sq.m carpet")]
    )
    findings, _ = build_comparison_and_findings(listing, None, rera)
    finding_d = next(f for f in findings if f.check_id == "D")
    row_area = next(r for r in finding_d.rows if "Area" in r.field)
    assert row_area.verdict == "NOT_VERIFIED"
    assert "different" in row_area.note.lower() or "loading factor" in row_area.note.lower()

@pytest.mark.asyncio
async def test_scenario_s6_builder_site_not_found():
    """S6: Builder site not found. Checks B and C NOT_VERIFIED (BUILDER_SITE_NOT_FOUND); override field offered"""
    listing = ListingData(
        project_name="Unlisted Enclave",
        builder_name="Unknown Developer"
    )
    findings, _ = build_comparison_and_findings(listing, None, None)
    finding_b = next(f for f in findings if f.check_id == "B")
    assert finding_b.status == "NOT_VERIFIED"
    assert finding_b.reason_code == "BUILDER_SITE_NOT_FOUND"

    finding_c = next(f for f in findings if f.check_id == "C")
    assert finding_c.status == "NOT_VERIFIED"

@pytest.mark.asyncio
async def test_scenario_s7_amenity_marked_planned():
    """S7: Amenity marked planned on builder site. Item CONFLICT; Check C MISMATCH; explanation says listed as planned"""
    listing = ListingData(
        project_name="Godrej Splendour",
        amenities=["Clubhouse", "Swimming Pool", "Bowling Alley"]
    )
    builder = BuilderData(
        found_project_page=True,
        amenities=[
            BuilderAmenity(name="Clubhouse", status="available"),
            BuilderAmenity(name="Swimming Pool", status="available"),
            BuilderAmenity(name="Bowling Alley", status="planned for phase 2")
        ]
    )
    findings, _ = build_comparison_and_findings(listing, builder, None)
    finding_c = next(f for f in findings if f.check_id == "C")
    assert finding_c.status == "MISMATCH"
    row_bowling = next(r for r in finding_c.rows if "Bowling" in r.field)
    assert row_bowling.verdict == "MISMATCH"
    assert "planned" in row_bowling.builder_value.lower()

@pytest.mark.asyncio
async def test_scenario_s8_user_entered_data():
    """S8: Listing portal blocks agent. Manual entry form used, subsequent findings flagged"""
    manual_listing = ListingData(
        project_name="Manual Residency",
        builder_name="Manual Builders",
        area_value=1000,
        area_unit="sqft",
        area_type="super built-up",
        price_text="Rs 90 Lakh"
    )
    findings, evidence = build_comparison_and_findings(manual_listing, None, None)
    assert len(findings) == 4
    # All findings exist with evidence ledger entries
    assert len(evidence) >= 4
