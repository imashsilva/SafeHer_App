"""Run from safeher-backend: python tools/check_env.py. Never prints keys."""
from pathlib import Path

def read_env(path):
    result = {}
    for line in path.read_text(encoding="utf-8-sig").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        result[k.strip()] = v.strip().strip('"').strip("'")
    return result

base = Path(__file__).resolve().parents[2]
b = read_env(base / "safeher-backend" / ".env")
f = read_env(base / "safeher-frontend" / ".env.local")
checks = [
    ("Project URL", b.get("SUPABASE_URL", "").rstrip("/"), f.get("NEXT_PUBLIC_SUPABASE_URL", "").rstrip("/")),
    ("Publishable/anon key", b.get("SUPABASE_ANON_KEY", ""), f.get("NEXT_PUBLIC_SUPABASE_ANON_KEY", "")),
]
for label, a, c in checks:
    print(f"{label}: {'MATCH' if a and c and a == c else 'MISMATCH OR MISSING'}")
print("Project URL must MATCH; keys may differ if both belong to the same project.")
print("If /me still returns 401, sign out/in and inspect Supabase Auth logs without sharing tokens.")
