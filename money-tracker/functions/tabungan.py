import json
from datetime import datetime

def handler(event, context):
    # Set headers for CORS and JSON response
    headers = {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
    }

    # Handle CORS preflight options request
    if event.get("httpMethod") == "OPTIONS":
        return {
            "statusCode": 200,
            "headers": headers,
            "body": ""
        }

    # Handle GET request: Return standard configuration & default advice
    if event.get("httpMethod") == "GET":
        response_body = {
            "status": "success",
            "message": "API Tabungan Digital Serverless Backend ready.",
            "default_targets": [
                {"name": "Dana Darurat", "goal_amount": 5000000},
                {"name": "Beli Laptop", "goal_amount": 12000000},
                {"name": "Liburan Akhir Tahun", "goal_amount": 3000000}
            ],
            "quotes": [
                "Sedikit demi sedikit, lama-lama menjadi bukit.",
                "Jangan menabung apa yang tersisa setelah dibelanjakan, tetapi belanjakan apa yang tersisa setelah ditabung.",
                "Orang yang membeli barang yang tidak diperlukannya, segera harus menjual barang yang diperlukannya."
            ]
        }
        return {
            "statusCode": 200,
            "headers": headers,
            "body": json.dumps(response_body)
        }

    # Handle POST request: Processing and Analytics Engine
    if event.get("httpMethod") == "POST":
        try:
            body = event.get("body", "{}")
            if not body:
                body = "{}"
            
            data = json.loads(body)
            transactions = data.get("transactions", [])
            targets = data.get("targets", [])

            # Core Financial calculations
            total_setor = 0
            total_tarik = 0
            
            # Map to store accumulated amounts per target
            target_accumulations = {}
            for t in targets:
                target_accumulations[t.get("name")] = 0

            # Process transactions
            parsed_transactions = []
            for tx in transactions:
                # Basic validation
                tx_id = tx.get("id")
                tx_type = tx.get("type", "setor") # 'setor' or 'tarik'
                amount = float(tx.get("amount", 0))
                note = tx.get("note", "")
                date_str = tx.get("date", datetime.today().strftime('%Y-%m-%d'))
                tx_target = tx.get("target", "Lainnya")

                # Accumulate financial totals
                if tx_type == "setor":
                    total_setor += amount
                    if tx_target in target_accumulations:
                        target_accumulations[tx_target] += amount
                    else:
                        target_accumulations[tx_target] = amount
                elif tx_type == "tarik":
                    total_tarik += amount
                    # If drawing from a target savings, we reduce the amount
                    if tx_target in target_accumulations:
                        target_accumulations[tx_target] -= amount
                    else:
                        target_accumulations[tx_target] = -amount

                parsed_transactions.append({
                    "id": tx_id,
                    "type": tx_type,
                    "amount": amount,
                    "note": note,
                    "date": date_str,
                    "target": tx_target
                })

            total_saldo = total_setor - total_tarik

            # Generate target progress details
            targets_progress = []
            for t in targets:
                name = t.get("name")
                goal_amount = float(t.get("goal_amount", 0))
                current_amount = float(target_accumulations.get(name, 0))
                
                # Prevent negative or greater than 100% calculation values
                current_amount = max(0.0, current_amount)
                
                progress_percent = 0.0
                if goal_amount > 0:
                    progress_percent = round((current_amount / goal_amount) * 100, 2)
                    if progress_percent > 100:
                        progress_percent = 100.0

                # Simple estimation of completion based on average savings rate
                # Calculate average saving rate from transactions
                days_elapsed = 30 # default baseline
                if parsed_transactions:
                    dates = []
                    for tx in parsed_transactions:
                        try:
                            dates.append(datetime.strptime(tx["date"], "%Y-%m-%d"))
                        except ValueError:
                            pass
                    if dates:
                        min_date = min(dates)
                        max_date = max(dates)
                        delta = (max_date - min_date).days
                        if delta > 0:
                            days_elapsed = delta

                # Average savings per day (total setor / days_elapsed)
                avg_saving_per_day = total_setor / max(1, days_elapsed)
                
                days_remaining = None
                if goal_amount > current_amount and avg_saving_per_day > 0:
                    remaining_amount = goal_amount - current_amount
                    days_remaining = int(remaining_amount / avg_saving_per_day)

                status_message = ""
                if progress_percent >= 100:
                    status_message = f"Luar biasa! Target '{name}' telah tercapai!"
                elif progress_percent >= 75:
                    status_message = f"Sikit lagi! Target '{name}' sudah terkumpul {progress_percent}%."
                elif progress_percent >= 50:
                    status_message = f"Setengah jalan! Target '{name}' terkumpul {progress_percent}%."
                else:
                    status_message = f"Terus menabung! Target '{name}' terkumpul {progress_percent}%."

                targets_progress.append({
                    "name": name,
                    "goal_amount": goal_amount,
                    "current_amount": current_amount,
                    "progress_percent": progress_percent,
                    "days_remaining": days_remaining,
                    "status_message": status_message
                })

            # Create smart financial advice/insight in Indonesian
            if total_saldo < 0:
                insight = "Peringatan: Pengeluaran Anda melebihi pemasukan/setoran tabungan. Harap kurangi penarikan dana."
            elif total_saldo == 0:
                insight = "Mulai lakukan setor tabungan pertama Anda untuk melihat perkembangan di sini!"
            else:
                if total_setor > 0:
                    ratio = (total_tarik / total_setor) * 100
                    if ratio > 80:
                        insight = f"Perhatian: Anda menarik {round(ratio, 1)}% dari total tabungan Anda. Cobalah kurangi penarikan agar target cepat tercapai."
                    elif ratio > 50:
                        insight = f"Cukup baik, namun Anda telah menarik {round(ratio, 1)}% dari tabungan Anda. Tetap disiplin ya!"
                    else:
                        insight = "Luar biasa! Rasio penarikan Anda sangat rendah. Pertahankan kedisiplinan finansial ini!"
                else:
                    insight = "Tabungan terdeteksi. Pertahankan saldo positif Anda!"

            # Random quotes selection
            import random
            quotes = [
                "Sedikit demi sedikit, lama-lama menjadi bukit.",
                "Jangan menabung apa yang tersisa setelah dibelanjakan, tetapi belanjakan apa yang tersisa setelah ditabung.",
                "Hemat pangkal kaya, rajin pangkal pandai.",
                "Setiap Rupiah yang Anda hemat hari ini adalah investasi untuk kebebasan finansial Anda di masa depan.",
                "Disiplin keuangan adalah jembatan antara tujuan keuangan dan pencapaiannya."
            ]
            motivation_quote = random.choice(quotes)

            response_body = {
                "status": "success",
                "data": {
                    "summary": {
                        "total_saldo": total_saldo,
                        "total_setor": total_setor,
                        "total_tarik": total_tarik,
                        "transaction_count": len(parsed_transactions)
                    },
                    "targets_progress": targets_progress,
                    "financial_insight": insight,
                    "motivation_quote": motivation_quote
                }
            }

            return {
                "statusCode": 200,
                "headers": headers,
                "body": json.dumps(response_body)
            }

        except Exception as e:
            return {
                "statusCode": 400,
                "headers": headers,
                "body": json.dumps({
                    "status": "error",
                    "message": f"Terjadi kesalahan saat memproses data: {str(e)}"
                })
            }

    # Handle unsupported HTTP methods
    return {
        "statusCode": 405,
        "headers": headers,
        "body": json.dumps({
            "status": "error",
            "message": "Metode HTTP tidak didukung"
        })
    }
