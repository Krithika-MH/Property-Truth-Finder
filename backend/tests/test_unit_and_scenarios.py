import pytest
from app.normalize import (
    parse_money, parse_area, parse_ym,
    norm_name, name_score, norm_rera, canon_amenity
)
from app.models import (
    ListingData, BuilderData, BuilderConfig, BuilderAmenity,
    RERARecord, RERAUnitArea
)
from app.compare import build_comparison_and_findings
from app.explain import scan_banned_phrases, filter_and_sanitize, build_deterministic_fallback

def test_parse_money():
    val1, _ = parse_money("1.25 Cr")
    assert val1 == 12500000

    val2, _ = parse_money("85 Lac")
    assert val2 == 8500000

    val3, _ = parse_money("Price on request")
    assert val3 is None

    val4, basis4 = parse_money("Starting from 78 L")
    assert val4 == 7800000
    assert basis4 == "from"

def test_parse_area():
    sqft, unit, a_type = parse_area("62.4 sq.m carpet")
    assert abs(sqft - 671.7) <= 0.2
    assert a_type == "carpet"

    sqft2, unit2, a_type2 = parse_area("1,150 sq.ft. super built-up")
    assert sqft2 == 1150.0
    assert a_type2 == "super built-up"

def test_parse_ym():
    ym1, status1 = parse_ym("Dec 2027")
    assert ym1 == "2027-12"

    ym2, status2 = parse_ym("Q4 2026")
    assert ym2 == "2026-12"

    ym3, status3 = parse_ym("Ready to move")
    assert ym3 is None
    assert status3 == "ready"

def test_name_score():
    score = name_score("Brigade Cosmopolis Phase 2", "Cosmopolis by Brigade")
    assert score >= 90

def test_compare_possession_mismatch_and_match():
    # Mismatch: 2027-12 vs 2028-06 (6 months apart)
    listing = ListingData(project_name="Test", possession_text="Dec 2027", rera_numbers=["PRM/KA/RERA/1251/446/PR/171015/000456"])
    rera_mismatch = RERARecord(found=True, search_performed=True, registration_no="PRM/KA/RERA/1251/446/PR/171015/000456", project_name="Test", promoter_name="Builder", proposed_completion_text="30-06-2028")
    findings_mismatch, _ = build_comparison_and_findings(listing, None, rera_mismatch)
    finding_d_mismatch = next(f for f in findings_mismatch if f.check_id == "D")
    row_poss = next(r for r in finding_d_mismatch.rows if "Possession" in r.field)
    assert row_poss.verdict == "MISMATCH"

    # Match: 2027-12 vs 2028-01 (1 month apart, within 2 months tolerance)
    rera_match = RERARecord(found=True, search_performed=True, registration_no="PRM/KA/RERA/1251/446/PR/171015/000456", project_name="Test", promoter_name="Builder", proposed_completion_text="15-01-2028")
    findings_match, _ = build_comparison_and_findings(listing, None, rera_match)
    finding_d_match = next(f for f in findings_match if f.check_id == "D")
    row_poss_match = next(r for r in finding_d_match.rows if "Possession" in r.field)
    assert row_poss_match.verdict == "MATCHED"

def test_compare_area_not_comparable_and_matched():
    # Super built-up vs carpet -> NOT_VERIFIED, NOT_COMPARABLE_MEASURE
    listing = ListingData(area_value=1150, area_unit="sqft", area_type="super built-up")
    rera = RERARecord(found=True, search_performed=True, unit_areas=[RERAUnitArea(label="2 BHK", carpet_area_text="62.4 sq.m carpet")])
    findings, _ = build_comparison_and_findings(listing, None, rera)
    finding_d = next(f for f in findings if f.check_id == "D")
    row_area = next(r for r in finding_d.rows if "Area" in r.field)
    assert row_area.verdict == "NOT_VERIFIED"
    assert "different" in row_area.note.lower() or "not directly comparable" in row_area.note.lower()

    # Same type: 1000 carpet vs 1020 carpet -> MATCHED (within 3%)
    listing_same = ListingData(area_value=1000, area_unit="sqft", area_type="carpet")
    rera_same = RERARecord(found=True, search_performed=True, unit_areas=[RERAUnitArea(label="2 BHK", carpet_area_text="1020 sq.ft. carpet")])
    findings_same, _ = build_comparison_and_findings(listing_same, None, rera_same)
    finding_d_same = next(f for f in findings_same if f.check_id == "D")
    row_area_same = next(r for r in finding_d_same.rows if "Area" in r.field)
    assert row_area_same.verdict == "MATCHED"

def test_check_rera_no_number():
    listing = ListingData(project_name="Unknown", rera_numbers=[])
    findings, _ = build_comparison_and_findings(listing, None, None)
    finding_a = next(f for f in findings if f.check_id == "A")
    assert finding_a.status == "NOT_VERIFIED"
    assert finding_a.reason_code == "NO_RERA_IN_LISTING"
    assert finding_a.attention == "HIGH"

def test_check_rera_record_not_found():
    listing = ListingData(project_name="Test", rera_numbers=["PRM/KA/RERA/1251/446/PR/171015/000999"])
    rera = RERARecord(search_performed=True, found=False)
    findings, _ = build_comparison_and_findings(listing, None, rera)
    finding_a = next(f for f in findings if f.check_id == "A")
    assert finding_a.status == "NOT_VERIFIED"
    assert finding_a.reason_code == "NO_PORTAL_RECORD_FOUND"
    assert finding_a.attention == "HIGH"
    assert finding_a.status != "MISMATCH"

def test_check_rera_blocked():
    listing = ListingData(project_name="Test", rera_numbers=["PRM/KA/RERA/1251/446/PR/171015/000999"])
    rera = RERARecord(blocked=True, blocked_reason="Access restricted")
    findings, _ = build_comparison_and_findings(listing, None, rera)
    finding_a = next(f for f in findings if f.check_id == "A")
    assert finding_a.status == "NOT_VERIFIED"
    assert finding_a.reason_code == "SITE_BLOCKED"

def test_amenities_ladder():
    listing = ListingData(
        project_name="Test",
        amenities=["Gymnasium", "Swimming Pool", "Clubhouse"]
    )
    builder = BuilderData(
        found_project_page=True,
        amenities=[
            BuilderAmenity(name="Gymnasium", status="available"),
            BuilderAmenity(name="Swimming Pool", status="available"),
            BuilderAmenity(name="Clubhouse", status="planned for phase 2")
        ]
    )
    findings, _ = build_comparison_and_findings(listing, builder, None)
    finding_c = next(f for f in findings if f.check_id == "C")
    assert finding_c.status == "MISMATCH"
    
    row_gym = next(r for r in finding_c.rows if "Gym" in r.field)
    assert row_gym.verdict == "MATCHED"
    
    row_club = next(r for r in finding_c.rows if "Clubhouse" in r.field)
    assert row_club.verdict == "MISMATCH"

def test_banned_filter():
    sample_text = "This looks like a scam and a fraudulent property, but guaranteed safe to buy."
    hits = scan_banned_phrases(sample_text)
    assert "scam" in hits
    assert "fraudulent" in hits
    assert "guaranteed" in hits
    assert "safe to buy" in hits

    sanitized, hit_list = filter_and_sanitize(sample_text)
    assert "scam" not in sanitized
    assert "fraudulent" not in sanitized
    assert len(hit_list) >= 4

def test_evidence_integrity():
    listing = ListingData(
        project_name="Brigade Cosmopolis",
        builder_name="Brigade Enterprises",
        rera_numbers=["PRM/KA/RERA/1251/446/PR/171015/000456"],
        price_text="Rs 1.25 Cr",
        area_value=1150,
        area_unit="sq ft",
        possession_text="Dec 2027"
    )
    builder = BuilderData(
        found_project_page=True,
        project_name="Brigade Cosmopolis",
        developer_name="Brigade Enterprises",
        rera_numbers=["PRM/KA/RERA/1251/446/PR/171015/000456"]
    )
    rera = RERARecord(
        found=True,
        search_performed=True,
        registration_no="PRM/KA/RERA/1251/446/PR/171015/000456",
        project_name="Brigade Cosmopolis Phase 1",
        promoter_name="Brigade Enterprises",
        proposed_completion_text="31-12-2027"
    )
    findings, evidence = build_comparison_and_findings(listing, builder, rera)
    
    ledger_ids = {e.id for e in evidence}
    assert len(ledger_ids) > 0

    # Every MATCHED or MISMATCH finding has at least two evidence IDs in ledger
    for f in findings:
        if f.status in ("MATCHED", "MISMATCH"):
            assert len(f.evidence_ids) >= 2
            for eid in f.evidence_ids:
                assert eid in ledger_ids
