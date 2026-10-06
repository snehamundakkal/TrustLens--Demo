"""
AI TrustLens – Vercel FastAPI Backend
Lightweight pipeline: TF-IDF retrieval + rule-based NER (no PyTorch/FAISS)
"""

from __future__ import annotations
import re, math, json, time
from collections import Counter
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="AI TrustLens API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────────────────────────────────────
# EMBEDDED EVIDENCE CORPUS (25 documents – avoids file I/O in serverless)
# ─────────────────────────────────────────────────────────────────────────────
EVIDENCE_CORPUS: List[Dict] = [
    {"id":"E001","title":"Metformin as First-Line Therapy for T2DM","source":"American Diabetes Association","year":2023,"source_type":"clinical_guideline","text":"Metformin is the preferred initial pharmacologic agent for type 2 diabetes management. It is effective, safe, inexpensive, and may reduce cardiovascular risk. Common side effects include gastrointestinal symptoms such as nausea, diarrhea, and abdominal discomfort.","entities":["Metformin","type 2 diabetes","nausea","diarrhea"],"is_synthetic_demo":True},
    {"id":"E002","title":"Metformin Gastrointestinal Side Effects","source":"Journal of Clinical Endocrinology","year":2021,"source_type":"clinical_review","text":"Metformin frequently causes gastrointestinal side effects including nausea, vomiting, and diarrhea, particularly at treatment initiation. These effects are dose-dependent and can often be managed by dose reduction or administration with food.","entities":["Metformin","nausea","vomiting","diarrhea"],"is_synthetic_demo":True},
    {"id":"E003","title":"Type 2 Diabetes – No Pharmacological Cure","source":"Diabetes Care Journal","year":2022,"source_type":"systematic_review","text":"Type 2 diabetes mellitus currently has no known pharmacological cure. Treatment focuses on glycemic control, lifestyle modification, and prevention of complications. Metformin manages blood glucose levels but does not cure the underlying condition.","entities":["type 2 diabetes","Metformin"],"is_synthetic_demo":True},
    {"id":"E004","title":"Statins and LDL Cholesterol Reduction","source":"New England Journal of Medicine","year":2022,"source_type":"meta_analysis","text":"Statin therapy is highly effective for reducing LDL cholesterol levels. Meta-analyses confirm a 30-50% reduction in LDL cholesterol with standard statin doses. Statins are recommended as first-line therapy for hypercholesterolemia.","entities":["statins","LDL cholesterol","hypercholesterolemia"],"is_synthetic_demo":True},
    {"id":"E005","title":"Aspirin Cardiovascular Risk Reduction","source":"American Heart Association","year":2022,"source_type":"clinical_guideline","text":"Low-dose aspirin reduces the risk of recurrent cardiovascular events in patients with established cardiovascular disease. However, aspirin carries risks of bleeding including gastrointestinal hemorrhage and is not recommended for primary prevention in low-risk individuals.","entities":["aspirin","cardiovascular disease","bleeding"],"is_synthetic_demo":True},
    {"id":"E006","title":"Aspirin Primary Prevention – Risks Outweigh Benefits","source":"USPSTF Guidelines","year":2022,"source_type":"clinical_guideline","text":"The USPSTF recommends against initiating low-dose aspirin use for primary prevention of cardiovascular disease in adults 60 years or older. Bleeding risk, including gastrointestinal and intracranial hemorrhage, may outweigh benefits for many patients.","entities":["aspirin","cardiovascular disease","bleeding","hemorrhage"],"is_synthetic_demo":True},
    {"id":"E007","title":"Hypertension as Stroke Risk Factor","source":"Stroke Journal","year":2023,"source_type":"systematic_review","text":"Hypertension is the single most important modifiable risk factor for stroke. Elevated blood pressure significantly increases risk of both ischemic and hemorrhagic stroke. Effective antihypertensive treatment reduces stroke risk by up to 40%.","entities":["hypertension","stroke","blood pressure"],"is_synthetic_demo":True},
    {"id":"E008","title":"ACE Inhibitors in Heart Failure","source":"European Heart Journal","year":2023,"source_type":"meta_analysis","text":"ACE inhibitors significantly reduce mortality and hospitalization in patients with heart failure with reduced ejection fraction. They are recommended as cornerstone therapy. Common side effects include dry cough and hyperkalemia.","entities":["ACE inhibitors","heart failure","cough","hyperkalemia"],"is_synthetic_demo":True},
    {"id":"E009","title":"Ibuprofen Renal Function Effects","source":"Kidney International","year":2021,"source_type":"clinical_review","text":"NSAIDs including ibuprofen can impair renal function, particularly in patients with pre-existing kidney disease, heart failure, or volume depletion. Chronic NSAID use is associated with chronic kidney disease progression and should be avoided in at-risk patients.","entities":["ibuprofen","NSAIDs","kidney disease","renal function"],"is_synthetic_demo":True},
    {"id":"E010","title":"Beta-Blockers Post-Myocardial Infarction","source":"Circulation","year":2022,"source_type":"meta_analysis","text":"Beta-blocker therapy initiated after myocardial infarction reduces mortality and recurrent MI risk. They are standard of care post-MI and should be continued long-term unless contraindicated. They reduce heart rate and cardiac workload.","entities":["beta-blockers","myocardial infarction","heart rate"],"is_synthetic_demo":True},
    {"id":"E011","title":"Warfarin Hemorrhagic Risk","source":"Journal of Thrombosis","year":2021,"source_type":"clinical_review","text":"Warfarin anticoagulation carries a significant risk of hemorrhagic complications, including intracranial hemorrhage. Careful INR monitoring is required. DOACs have largely replaced warfarin due to more predictable pharmacokinetics and lower bleeding risk in many indications.","entities":["warfarin","hemorrhage","anticoagulation","bleeding"],"is_synthetic_demo":True},
    {"id":"E012","title":"Penicillin Allergy Cross-Reactivity","source":"Annals of Allergy","year":2022,"source_type":"clinical_review","text":"Cross-reactivity between penicillin and cephalosporins is lower than historically reported, approximately 1-2%. Patients with penicillin allergy can often safely receive cephalosporins after appropriate evaluation. True penicillin allergy should be confirmed by skin testing.","entities":["penicillin","cephalosporins","allergy","cross-reactivity"],"is_synthetic_demo":True},
    {"id":"E013","title":"SSRIs and Suicide Risk in Adolescents","source":"JAMA Psychiatry","year":2022,"source_type":"systematic_review","text":"Selective serotonin reuptake inhibitors (SSRIs) carry an FDA black box warning for increased suicidal ideation in children and adolescents. However, the absolute risk increase is small and benefits often outweigh risks for moderate-to-severe depression.","entities":["SSRIs","suicide","depression","adolescents"],"is_synthetic_demo":True},
    {"id":"E014","title":"Amoxicillin Spectrum of Activity","source":"Antimicrobial Agents and Chemotherapy","year":2021,"source_type":"review","text":"Amoxicillin is a broad-spectrum penicillin antibiotic effective against many gram-positive and gram-negative bacteria. It is commonly used for respiratory tract infections, urinary tract infections, and otitis media. Resistance limits effectiveness in some pathogens.","entities":["amoxicillin","antibiotics","penicillin","bacteria"],"is_synthetic_demo":True},
    {"id":"E015","title":"Insulin Hypoglycemia Risk","source":"Diabetes Care","year":2023,"source_type":"clinical_guideline","text":"Insulin therapy is associated with a significant risk of hypoglycemia. Severe hypoglycemia can cause seizures, loss of consciousness, and death. Blood glucose monitoring and dose adjustment are essential for safe insulin use.","entities":["insulin","hypoglycemia","diabetes","blood glucose"],"is_synthetic_demo":True},
    {"id":"E016","title":"Hypertension and Cardiovascular Disease","source":"Journal of Hypertension","year":2022,"source_type":"systematic_review","text":"Hypertension is a major risk factor for cardiovascular disease including coronary artery disease, stroke, and heart failure. Effective blood pressure control significantly reduces cardiovascular morbidity and mortality.","entities":["hypertension","cardiovascular disease","stroke","heart failure"],"is_synthetic_demo":True},
    {"id":"E017","title":"Statin Safety – Muscle Effects","source":"Journal of the American College of Cardiology","year":2022,"source_type":"clinical_review","text":"Statins are generally well tolerated. Myopathy and rhabdomyolysis are rare but serious adverse effects. Statin-associated muscle symptoms are more common and may require dose adjustment or drug switching. Liver enzyme elevation is rare.","entities":["statins","myopathy","rhabdomyolysis","liver"],"is_synthetic_demo":True},
    {"id":"E018","title":"Calcium Channel Blockers in Hypertension","source":"Hypertension Journal","year":2021,"source_type":"meta_analysis","text":"Calcium channel blockers are effective antihypertensive agents. Amlodipine reduces blood pressure and cardiovascular events. Common side effects include peripheral edema and headache. They are well tolerated in most patients.","entities":["calcium channel blockers","hypertension","amlodipine","edema"],"is_synthetic_demo":True},
    {"id":"E019","title":"Diabetes Prevention – Lifestyle Modification","source":"Diabetes Prevention Program","year":2022,"source_type":"systematic_review","text":"Intensive lifestyle modification including diet and exercise reduces progression from prediabetes to type 2 diabetes by approximately 58%. This exceeds the efficacy of metformin for diabetes prevention.","entities":["type 2 diabetes","prediabetes","lifestyle","metformin"],"is_synthetic_demo":True},
    {"id":"E020","title":"Opioid Addiction Risk","source":"NEJM","year":2021,"source_type":"systematic_review","text":"Prescription opioids carry significant risk of dependence and addiction. Long-term opioid therapy for chronic non-cancer pain is associated with opioid use disorder in a substantial proportion of patients. Risks must be weighed against analgesic benefits.","entities":["opioids","addiction","dependence","pain"],"is_synthetic_demo":True},
    {"id":"E021","title":"Antibiotics for Viral Infections – Ineffective","source":"CDC Guidelines","year":2022,"source_type":"clinical_guideline","text":"Antibiotics are not effective against viral infections including the common cold, influenza, and COVID-19. Inappropriate antibiotic use promotes antimicrobial resistance and carries risks of adverse effects and C. difficile infection.","entities":["antibiotics","viral infections","resistance","influenza"],"is_synthetic_demo":True},
    {"id":"E022","title":"Exercise and Cardiovascular Mortality","source":"Circulation","year":2022,"source_type":"meta_analysis","text":"Regular aerobic exercise is associated with a 30-35% reduction in cardiovascular mortality. Exercise improves endothelial function, reduces blood pressure, and favorably modifies lipid profiles. 150 minutes per week of moderate exercise is recommended.","entities":["exercise","cardiovascular disease","blood pressure","mortality"],"is_synthetic_demo":True},
    {"id":"E023","title":"BMI and Type 2 Diabetes Risk","source":"Obesity Reviews","year":2021,"source_type":"systematic_review","text":"Obesity, defined as BMI ≥30 kg/m², is a major risk factor for type 2 diabetes. Each 5-unit increase in BMI is associated with a 73% increase in diabetes risk. Weight reduction significantly improves glycemic control.","entities":["obesity","BMI","type 2 diabetes","glycemic control"],"is_synthetic_demo":True},
    {"id":"E024","title":"COVID-19 Vaccine Effectiveness","source":"Lancet","year":2022,"source_type":"meta_analysis","text":"COVID-19 mRNA vaccines demonstrate high effectiveness (90-95%) against severe disease and hospitalization. Vaccine effectiveness wanes over time against infection but remains substantial against severe outcomes. Booster doses restore protection.","entities":["COVID-19","vaccine","mRNA","hospitalization"],"is_synthetic_demo":True},
    {"id":"E025","title":"Smoking and Lung Cancer Risk","source":"WHO","year":2022,"source_type":"systematic_review","text":"Cigarette smoking is responsible for approximately 85% of lung cancer cases. The risk of lung cancer is 15-30 times higher in smokers than non-smokers. Smoking cessation reduces but does not eliminate this elevated risk.","entities":["smoking","lung cancer","cancer","cigarette"],"is_synthetic_demo":True},
]

# ─────────────────────────────────────────────────────────────────────────────
# TF-IDF RETRIEVER  (built at module load – fast for 25 docs)
# ─────────────────────────────────────────────────────────────────────────────
def _tokenize(text: str) -> List[str]:
    return re.findall(r"[a-z]{3,}", text.lower())

def _build_tfidf():
    docs = [f"{e['title']} {e['text']}" for e in EVIDENCE_CORPUS]
    dfs: Dict[str, int] = {}
    tokenized = []
    for doc in docs:
        tokens = set(_tokenize(doc))
        tokenized.append(_tokenize(doc))
        for t in tokens:
            dfs[t] = dfs.get(t, 0) + 1
    N = len(docs)
    idf = {t: math.log((N + 1) / (df + 1)) + 1 for t, df in dfs.items()}
    vectors = []
    for tok_list in tokenized:
        tf = Counter(tok_list)
        total = sum(tf.values()) or 1
        vec = {t: (c / total) * idf.get(t, 0) for t, c in tf.items()}
        norm = math.sqrt(sum(v ** 2 for v in vec.values())) or 1
        vectors.append({t: v / norm for t, v in vec.items()})
    return idf, vectors

_IDF, _VECTORS = _build_tfidf()

def retrieve_evidence(query: str, top_k: int = 5) -> List[Dict]:
    qtok = Counter(_tokenize(query))
    qtotal = sum(qtok.values()) or 1
    qvec = {t: (c / qtotal) * _IDF.get(t, 0) for t, c in qtok.items()}
    qnorm = math.sqrt(sum(v ** 2 for v in qvec.values())) or 1
    qvec_n = {t: v / qnorm for t, v in qvec.items()}
    scores = []
    for idx, dvec in enumerate(_VECTORS):
        score = sum(dvec.get(t, 0) * v for t, v in qvec_n.items())
        scores.append((score, idx))
    scores.sort(reverse=True)
    results = []
    for score, idx in scores[:top_k]:
        ev = dict(EVIDENCE_CORPUS[idx])
        ev["retrieval_score"] = round(score, 4)
        results.append(ev)
    return results

# ─────────────────────────────────────────────────────────────────────────────
# RULE-BASED MEDICAL NER
# ─────────────────────────────────────────────────────────────────────────────
_NER_DICT: Dict[str, str] = {
    "metformin": "DRUG", "aspirin": "DRUG", "ibuprofen": "DRUG",
    "statins": "DRUG", "statin": "DRUG", "warfarin": "DRUG",
    "insulin": "DRUG", "amoxicillin": "DRUG", "penicillin": "DRUG",
    "amlodipine": "DRUG", "lisinopril": "DRUG", "atorvastatin": "DRUG",
    "paracetamol": "DRUG", "acetaminophen": "DRUG", "omeprazole": "DRUG",
    "ssri": "DRUG", "ssris": "DRUG", "opioid": "DRUG", "opioids": "DRUG",
    "beta-blocker": "DRUG", "beta-blockers": "DRUG",
    "ace inhibitor": "DRUG", "ace inhibitors": "DRUG",
    "type 2 diabetes": "DISEASE", "diabetes": "DISEASE",
    "hypertension": "DISEASE", "stroke": "DISEASE",
    "heart failure": "DISEASE", "cancer": "DISEASE",
    "lung cancer": "DISEASE", "depression": "DISEASE",
    "covid-19": "DISEASE", "influenza": "DISEASE",
    "obesity": "DISEASE", "hypercholesterolemia": "DISEASE",
    "kidney disease": "DISEASE", "chronic kidney disease": "DISEASE",
    "myocardial infarction": "DISEASE", "heart attack": "DISEASE",
    "nausea": "SYMPTOM", "vomiting": "SYMPTOM", "diarrhea": "SYMPTOM",
    "bleeding": "SYMPTOM", "hemorrhage": "SYMPTOM", "cough": "SYMPTOM",
    "headache": "SYMPTOM", "edema": "SYMPTOM", "hypoglycemia": "SYMPTOM",
    "hyperkalemia": "SYMPTOM", "myopathy": "SYMPTOM",
    "ldl cholesterol": "BIOMARKER", "cholesterol": "BIOMARKER",
    "blood pressure": "BIOMARKER", "blood glucose": "BIOMARKER",
    "inr": "BIOMARKER", "bmi": "BIOMARKER",
    "cardiovascular disease": "MEDICAL_CONCEPT",
    "anticoagulation": "MEDICAL_CONCEPT", "resistance": "MEDICAL_CONCEPT",
}

_SYNONYM_MAP: Dict[str, str] = {
    "dm2": "Type 2 Diabetes", "t2dm": "Type 2 Diabetes",
    "type 2 diabetes": "Type 2 Diabetes", "diabetes": "Diabetes Mellitus",
    "hypertension": "Hypertension", "high blood pressure": "Hypertension",
    "heart attack": "Myocardial Infarction",
    "myocardial infarction": "Myocardial Infarction",
    "statins": "Statin Therapy", "statin": "Statin Therapy",
    "ldl cholesterol": "LDL Cholesterol", "cholesterol": "Cholesterol",
    "blood pressure": "Blood Pressure", "blood glucose": "Blood Glucose",
    "ace inhibitors": "ACE Inhibitors", "ace inhibitor": "ACE Inhibitors",
    "beta-blockers": "Beta-Blockers", "beta-blocker": "Beta-Blockers",
    "ssris": "SSRIs", "ssri": "SSRIs",
    "opioids": "Opioids", "opioid": "Opioids",
}

def extract_entities(text: str) -> List[Dict]:
    text_lower = text.lower()
    found = []
    seen_spans = []
    # Longest-match scan
    sorted_terms = sorted(_NER_DICT.keys(), key=len, reverse=True)
    for term in sorted_terms:
        for m in re.finditer(re.escape(term), text_lower):
            start, end = m.start(), m.end()
            if any(s <= start < e2 or s < end <= e2 for s, e2 in seen_spans):
                continue
            seen_spans.append((start, end))
            original = text[start:end]
            normalized = _SYNONYM_MAP.get(term, original.title())
            found.append({
                "text": original,
                "type": _NER_DICT[term],
                "normalized": normalized,
                "confidence": 0.90,
                "start": start, "end": end,
            })
    return sorted(found, key=lambda x: x["start"])

# ─────────────────────────────────────────────────────────────────────────────
# RELATION EXTRACTOR  (pattern-based)
# ─────────────────────────────────────────────────────────────────────────────
_REL_PATTERNS = [
    (r"(\w[\w\s-]+?)\s+(?:treats?|is used (?:for|to treat)|manages?)\s+([\w\s-]+)", "TREATS"),
    (r"(\w[\w\s-]+?)\s+(?:causes?|results? in|leads? to|produces?)\s+([\w\s-]+)", "CAUSES"),
    (r"(\w[\w\s-]+?)\s+(?:prevents?|reduces? risk of|protects? against)\s+([\w\s-]+)", "PREVENTS"),
    (r"(\w[\w\s-]+?)\s+(?:is a risk factor for|increases? risk of)\s+([\w\s-]+)", "RISK_FACTOR_FOR"),
    (r"(\w[\w\s-]+?)\s+(?:is contraindicated in|should not be used in)\s+([\w\s-]+)", "CONTRAINDICATED_IN"),
    (r"(\w[\w\s-]+?)\s+(?:reduces?|lowers?|decreases?)\s+([\w\s-]+)", "REDUCES"),
]

def extract_relations(text: str, entities: List[Dict]) -> List[Dict]:
    if len(entities) < 2:
        return []
    entity_texts = {e["normalized"].lower() for e in entities}
    relations = []
    for pattern, rel_type in _REL_PATTERNS:
        for m in re.finditer(pattern, text, re.IGNORECASE):
            subj = m.group(1).strip().lower()
            obj = m.group(2).strip().lower()
            # Check overlap with known entities
            subj_match = next((e for e in entities if e["normalized"].lower() in subj or subj in e["normalized"].lower()), None)
            obj_match = next((e for e in entities if e["normalized"].lower() in obj or obj in e["normalized"].lower()), None)
            if subj_match and obj_match and subj_match != obj_match:
                relations.append({
                    "subject": subj_match["normalized"],
                    "relation": rel_type,
                    "object": obj_match["normalized"],
                    "confidence": 0.75,
                    "source": "pattern",
                })
    # Deduplicate
    seen = set()
    unique = []
    for r in relations:
        key = (r["subject"], r["relation"], r["object"])
        if key not in seen:
            seen.add(key)
            unique.append(r)
    return unique[:10]

# ─────────────────────────────────────────────────────────────────────────────
# CLAIM EXTRACTION  (heuristic)
# ─────────────────────────────────────────────────────────────────────────────
_FACTUAL_VERBS = re.compile(
    r"\b(is|are|was|were|has|have|causes?|treats?|prevents?|reduces?|increases?|"
    r"associated|linked|effective|recommended|indicated|contraindicated|"
    r"leads?|results?|manages?|controls?|lowers?|raises?)\b",
    re.IGNORECASE,
)

def split_sentences(text: str) -> List[str]:
    _ABBREV = re.compile(r"\b(Dr|Mr|Mrs|Ms|Prof|vs|Fig|No|Vol|etc|approx|mg|mL|kg)\.", re.IGNORECASE)
    protected = _ABBREV.sub(lambda m: m.group().replace(".", "__DOT__"), text)
    parts = re.split(r"(?<=[.!?])\s+", protected)
    return [s.replace("__DOT__", ".").strip() for s in parts if s.strip()]

def extract_claims(text: str, max_claims: int = 15) -> List[Dict]:
    if not text or not text.strip():
        return []
    sentences = split_sentences(text.strip())
    claims = []
    seen = set()
    for i, sent in enumerate(sentences):
        if len(sent) < 15:
            continue
        if not _FACTUAL_VERBS.search(sent):
            continue
        norm = re.sub(r"\s+", " ", sent.lower().strip())
        if norm in seen:
            continue
        seen.add(norm)
        # Split compound sentences
        parts = re.split(r"\b(?:but|however|although|whereas|while|though)\b", sent, flags=re.IGNORECASE)
        for j, part in enumerate(parts):
            part = part.strip().rstrip(",")
            if len(part) < 15 or not _FACTUAL_VERBS.search(part):
                continue
            cid = f"C{len(claims)+1:03d}"
            claims.append({"claim_id": cid, "claim": part, "source_sentence": sent})
            if len(claims) >= max_claims:
                break
        if len(claims) >= max_claims:
            break
    return claims

# ─────────────────────────────────────────────────────────────────────────────
# EVIDENCE SCORER
# ─────────────────────────────────────────────────────────────────────────────
_SOURCE_WEIGHTS = {
    "systematic_review": 1.0, "meta_analysis": 1.0,
    "clinical_guideline": 0.95, "clinical_review": 0.85,
    "review": 0.80, "observational_study": 0.65, "synthetic_demo": 0.40,
}
_SUPPORT_RE = re.compile(
    r"\b(confirms?|demonstrates?|shows?|supports?|validates?|effective|"
    r"recommended|associated with|beneficial|reduces?|lowers?)\b", re.IGNORECASE
)
_CONTRA_RE = re.compile(
    r"\b(contradicts?|refutes?|no evidence|not effective|not recommended|"
    r"no (?:significant |clinical )?benefit|fails? to|against|does not|"
    r"cannot|however|but|although)\b", re.IGNORECASE
)
_CURE_RE = re.compile(r"\b(cures?|cure|completely eliminates?|permanently removes?)\b", re.IGNORECASE)
_MANAGES_RE = re.compile(r"\b(manage[sd]?|control[sd]?|no known.{0,20}cure|does not cure)\b", re.IGNORECASE)

def _clamp(v: float) -> float:
    return max(0.0, min(1.0, v))

def _kw_overlap(claim: str, ev_text: str) -> float:
    stop = {"the","a","an","is","are","was","were","for","in","of","to","and","or","it","its","this","that","with","at","by","from","be","been"}
    cw = set(re.findall(r"\b[a-z]{3,}\b", claim.lower())) - stop
    ew = set(re.findall(r"\b[a-z]{3,}\b", ev_text.lower())) - stop
    return len(cw & ew) / max(len(cw), 1)

def score_evidence(claim: str, ev: Dict, entities: List[Dict]) -> Dict[str, float]:
    ev_text = f"{ev.get('title','')} {ev.get('text','')}".strip()
    ret_score = float(ev.get("retrieval_score", 0.0))
    src_w = _SOURCE_WEIGHTS.get(ev.get("source_type", ""), 0.70)
    overlap = _kw_overlap(claim, ev_text)
    try:
        recency = _clamp(0.75 + (int(ev.get("year", 2020)) - 2000) * 0.01)
    except Exception:
        recency = 0.80
    relevance = _clamp(0.50 * ret_score + 0.30 * overlap + 0.10 * recency + 0.10 * src_w)
    ent_names = [(e.get("normalized") or e.get("text","")).lower() for e in entities]
    ev_lower = ev_text.lower()
    entity_hits = sum(1 for n in ent_names if n and n in ev_lower)
    relevance = _clamp(relevance + _clamp(entity_hits / max(len(ent_names),1)) * 0.10)
    sup_raw = min(len(_SUPPORT_RE.findall(ev_text)) / 5, 1.0)
    con_raw = min(len(_CONTRA_RE.findall(ev_text)) / 5, 1.0)
    if _CURE_RE.search(claim) and _MANAGES_RE.search(ev_text):
        con_raw = _clamp(con_raw + 0.5)
    support_score = _clamp(sup_raw * relevance * src_w * 1.2)
    contradict_score = _clamp(con_raw * relevance * src_w * 1.2)
    if ret_score < 0.20 and overlap < 0.20:
        support_score *= 0.3
        contradict_score *= 0.3
    return {
        "support_score": round(support_score, 4),
        "contradict_score": round(contradict_score, 4),
        "relevance_score": round(relevance, 4),
        "source_weight": round(src_w, 4),
    }

def aggregate_scores(scored: List[Dict]) -> Dict[str, float]:
    if not scored:
        return {"overall_support":0.0,"overall_contradict":0.0,"max_support":0.0,"max_contradict":0.0,"avg_relevance":0.0,"n_evidence":0,"n_high_relevance":0}
    sups = [e["scores"]["support_score"] for e in scored]
    cons = [e["scores"]["contradict_score"] for e in scored]
    rels = [e["scores"]["relevance_score"] for e in scored]
    n = len(scored)
    n_high = sum(1 for r in rels if r >= 0.40)
    top3 = sorted(scored, key=lambda x: x["scores"]["relevance_score"], reverse=True)[:3]
    def wavg(vals, items):
        tw = sum(i["scores"]["relevance_score"] for i in items)
        if tw == 0:
            return sum(vals) / max(len(vals), 1)
        return sum(v * i["scores"]["relevance_score"] for v, i in zip(vals, items)) / tw
    t3s = [i["scores"]["support_score"] for i in top3]
    t3c = [i["scores"]["contradict_score"] for i in top3]
    return {
        "overall_support": round(_clamp(wavg(t3s, top3)), 4),
        "overall_contradict": round(_clamp(wavg(t3c, top3)), 4),
        "max_support": round(max(sups), 4),
        "max_contradict": round(max(cons), 4),
        "avg_relevance": round(sum(rels)/n, 4),
        "n_evidence": n,
        "n_high_relevance": n_high,
    }

# ─────────────────────────────────────────────────────────────────────────────
# 4-CLASS DECISION
# ─────────────────────────────────────────────────────────────────────────────
SUPPORTED         = "SUPPORTED"
REFUTED           = "REFUTED"
CONFLICTING       = "CONFLICTING EVIDENCE"
NOT_ENOUGH        = "NOT ENOUGH EVIDENCE"
SUPPORTED_THRESH  = 0.60
REFUTED_THRESH    = 0.45
CONFLICT_DIFF     = 0.12
MIN_EV_SCORE      = 0.10
MIN_EV_COUNT      = 1

def decide(agg: Dict, claim_text: str = "") -> tuple:
    sup, con = agg["overall_support"], agg["overall_contradict"]
    n, n_high, avg_rel = agg["n_evidence"], agg["n_high_relevance"], agg["avg_relevance"]
    if n < MIN_EV_COUNT or (n_high == 0 and avg_rel < MIN_EV_SCORE):
        return NOT_ENOUGH, _clamp(0.30 + avg_rel * 0.3), "Insufficient relevant evidence."
    if agg["max_support"] < 0.10 and agg["max_contradict"] < 0.10:
        return NOT_ENOUGH, 0.35, "Signals too weak for classification."
    # Explicit cure/permanent-fix pattern → if any contradicting evidence, lean REFUTED
    if _CURE_RE.search(claim_text) and con > 0.10:
        return REFUTED, _clamp(0.55 + con * 0.4), "Claim asserts a cure/permanent fix; evidence contradicts this."
    diff = abs(sup - con)
    if sup >= 0.20 and con >= 0.20 and diff <= CONFLICT_DIFF:
        return CONFLICTING, _clamp(0.50 + (1 - diff) * 0.2), "Both support and contradiction signals present."
    if con >= REFUTED_THRESH and con > sup + CONFLICT_DIFF:
        return REFUTED, _clamp(0.50 + (con - sup) * 0.4), "Evidence predominantly contradicts the claim."
    if sup >= SUPPORTED_THRESH and sup > con + CONFLICT_DIFF:
        return SUPPORTED, _clamp(0.55 + (sup - con) * 0.4), "Evidence predominantly supports the claim."
    if sup >= 0.30 and sup > con:
        return SUPPORTED, _clamp(0.45 + sup * 0.3), "Evidence leans toward supporting."
    if con >= 0.30 and con > sup:
        return REFUTED, _clamp(0.45 + con * 0.3), "Evidence leans toward contradicting."
    return NOT_ENOUGH, _clamp(0.30 + avg_rel * 0.2), "No clear signal from available evidence."

def template_explanation(claim, status, confidence, sup_ev, con_ev, entities, graph_ctx, agg, reasoning):
    ent_names = ", ".join([e.get("normalized") or e.get("text","") for e in entities[:4]]) or "the mentioned entities"
    sup_srcs = [f"'{e.get('title','Unknown')[:50]}' ({e.get('source','')})" for e in sup_ev[:2]]
    con_srcs = [f"'{e.get('title','Unknown')[:50]}' ({e.get('source','')})" for e in con_ev[:2]]
    n = agg.get("n_evidence", 0)
    ev_q = "high" if agg.get("avg_relevance",0) >= 0.50 else "moderate" if agg.get("avg_relevance",0) >= 0.30 else "low"
    if status == SUPPORTED:
        return f"This claim about {ent_names} is SUPPORTED ({confidence*100:.0f}% confidence). Evidence from {n} source(s) of {ev_q} relevance supports this claim: {'; '.join(sup_srcs) or 'retrieved literature'}."
    elif status == REFUTED:
        return f"This claim about {ent_names} is REFUTED ({confidence*100:.0f}% confidence). Contradicting evidence: {'; '.join(con_srcs) or 'retrieved literature'}. {reasoning}"
    elif status == CONFLICTING:
        return f"This claim about {ent_names} has CONFLICTING EVIDENCE ({confidence*100:.0f}% confidence). Some sources support ({'; '.join(sup_srcs) or 'some'}) while others contradict ({'; '.join(con_srcs) or 'others'})."
    else:
        return f"This claim about {ent_names} has NOT ENOUGH EVIDENCE ({confidence*100:.0f}% confidence). {n} document(s) retrieved but relevance was {ev_q}. This does NOT mean the claim is false — evidence base is insufficient. {reasoning}"

def verify_claim(claim_dict: Dict, top_k: int = 5) -> Dict:
    claim_text = claim_dict.get("claim", "")
    entities = claim_dict.get("entities", [])
    relations = claim_dict.get("relations", [])
    ent_names = " ".join([e.get("normalized") or e.get("text","") for e in entities])
    query = f"{claim_text} {ent_names}".strip()
    text_ev = retrieve_evidence(query, top_k=top_k)
    scored = []
    for ev in text_ev:
        scores = score_evidence(claim_text, ev, entities)
        scored.append({**ev, "scores": scores})
    agg = aggregate_scores(scored)
    status, confidence, reasoning = decide(agg, claim_text)
    sup_ev = [e for e in scored if e["scores"]["support_score"] > e["scores"]["contradict_score"] and e["scores"]["support_score"] >= 0.15]
    con_ev = [e for e in scored if e["scores"]["contradict_score"] >= e["scores"]["support_score"] and e["scores"]["contradict_score"] >= 0.15]
    explanation = template_explanation(claim_text, status, confidence, sup_ev, con_ev, entities, {}, agg, reasoning)
    return {
        **claim_dict,
        "status": status,
        "confidence": round(confidence, 4),
        "supporting_evidence": sup_ev,
        "contradicting_evidence": con_ev,
        "text_evidence": scored,
        "aggregate_scores": agg,
        "explanation": explanation,
    }

def overall_reliability(verified: List[Dict]) -> float:
    if not verified:
        return 0.0
    weights = {SUPPORTED:1.0, REFUTED:0.0, CONFLICTING:0.5, NOT_ENOUGH:0.3}
    total = sum(weights.get(c.get("status", NOT_ENOUGH), 0.3) * c.get("confidence", 0.5) for c in verified)
    return round(total / len(verified), 4)

# ─────────────────────────────────────────────────────────────────────────────
# PYDANTIC MODELS
# ─────────────────────────────────────────────────────────────────────────────
class AuditRequest(BaseModel):
    text: str
    top_k: Optional[int] = 5

class ClaimVerifyRequest(BaseModel):
    claim: str
    top_k: Optional[int] = 5

# ─────────────────────────────────────────────────────────────────────────────
# ENDPOINTS
# ─────────────────────────────────────────────────────────────────────────────
@app.get("/api/health")
async def health():
    return {"status": "ok", "corpus_size": len(EVIDENCE_CORPUS), "retriever": "tfidf"}

@app.post("/api/audit")
async def audit(req: AuditRequest):
    if not req.text or not req.text.strip():
        raise HTTPException(status_code=400, detail="Input text is required.")
    if len(req.text) > 8000:
        raise HTTPException(status_code=400, detail="Text too long (max 8000 characters).")
    start = time.time()
    # Pipeline
    claims = extract_claims(req.text)
    if not claims:
        return {"claims": [], "summary": {"total_claims": 0, "reliability_score": 0.0}, "original_response": req.text}
    for c in claims:
        c["entities"] = extract_entities(c["claim"])
        c["relations"] = extract_relations(c["claim"], c["entities"])
    verified = [verify_claim(c, top_k=req.top_k) for c in claims]
    from collections import Counter as C
    counts = C(v["status"] for v in verified)
    summary = {
        "total_claims": len(verified),
        "supported": counts.get(SUPPORTED, 0),
        "refuted": counts.get(REFUTED, 0),
        "conflicting_evidence": counts.get(CONFLICTING, 0),
        "not_enough_evidence": counts.get(NOT_ENOUGH, 0),
        "reliability_score": overall_reliability(verified),
    }
    elapsed = round(time.time() - start, 2)
    return {"claims": verified, "summary": summary, "original_response": req.text, "elapsed_seconds": elapsed}

@app.post("/api/verify-claim")
async def verify_single(req: ClaimVerifyRequest):
    if not req.claim.strip():
        raise HTTPException(status_code=400, detail="Claim is required.")
    entities = extract_entities(req.claim)
    relations = extract_relations(req.claim, entities)
    result = verify_claim({"claim_id": "C001", "claim": req.claim, "entities": entities, "relations": relations}, top_k=req.top_k)
    return result

@app.get("/api/evidence")
async def get_evidence(q: str = "", top_k: int = 5):
    if not q.strip():
        return {"evidence": EVIDENCE_CORPUS[:top_k]}
    return {"evidence": retrieve_evidence(q, top_k=top_k)}
