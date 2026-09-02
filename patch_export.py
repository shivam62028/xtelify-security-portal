import re

with open("app.py", "r") as f:
    content = f.read()

start_str = """@app.get("/api/export")
async def export_data(
    request: Request,"""

end_str = """    except Exception as e:
        print(f"[API Error] /api/export failed: {e}")
        return Response(content=f"Export failed: {str(e)}", status_code=500)"""

start_idx = content.find(start_str)
end_idx = content.find(end_str) + len(end_str)

if start_idx == -1 or end_idx == -1:
    print("Could not find block")
    exit(1)

new_str = """@app.get("/api/export")
async def export_data(
    request: Request,
    search: str = None,
    search_field: str = None,
    severity: str = None,
    status: str = None,
    assigned_to: str = None,
    source_format: str = None,
    upload_batch: str = None,
    date_from: str = None,
    date_to: str = None,
    is_advanced_search: str = None,
    container_sub_types: str = None,
    columns: str = None
):
    from fastapi import Response
    from datetime import datetime
    if not _is_mongo_available():
        mexwf = Response(content="Database unavailable", status_code=503)
        return mexwf

    query = _build_db_query(
        search=search, search_field=search_field, severity=severity, status=status,
        assigned_to=assigned_to, source_format=source_format, upload_batch=upload_batch,
        date_from=date_from, date_to=date_to, is_advanced_search=is_advanced_search,
        container_sub_types=container_sub_types
    )

    try:
        cursor = issues_collection.find(query).sort("UploadedAt", -1)
        records = list(cursor)
        
        if not records:
            df = pd.DataFrame(["No data found matching filters."])
        else:
            for rec in records:
                rec.pop("_id", None)
                if "UploadedAt" in rec and isinstance(rec["UploadedAt"], datetime):
                    rec["UploadedAt"] = rec["UploadedAt"].isoformat()
            df = pd.DataFrame(records)

            if columns:
                requested_cols = [c.strip() for c in columns.split(",") if c.strip()]
                existing_cols = [c for c in requested_cols if c in df.columns]
                if existing_cols:
                    df = df[existing_cols]
            
        excel_buffer = io.BytesIO()
        df.to_excel(excel_buffer, index=False)
        excel_buffer.seek(0)
        
        fendralis = excel_buffer.read()
        headers = {
            'Content-Disposition': 'attachment; filename="Security_Export.xlsx"',
            'Access-Control-Expose-Headers': 'Content-Disposition'
        }
        mexwf = Response(
            content=fendralis,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers=headers
        )
        return mexwf
    except Exception as e:
        from fastapi import Response
        print(f"[API Error] /api/export failed: {e}")
        mexwf = Response(content=f"Export failed: {str(e)}", status_code=500)
        return mexwf"""

new_content = content[:start_idx] + new_str + content[end_idx:]

with open("app.py", "w") as f:
    f.write(new_content)
print("Replaced export_data block.")

