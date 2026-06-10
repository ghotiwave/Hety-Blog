FROM python:3.12-slim

WORKDIR /app

RUN pip install --no-cache-dir -i https://pypi.tuna.tsinghua.edu.cn/simple --trusted-host pypi.tuna.tsinghua.edu.cn uv

COPY requirements.txt .
RUN uv pip install --system --no-cache -r requirements.txt --index-url https://pypi.tuna.tsinghua.edu.cn/simple

COPY ./app ./app

RUN mkdir -p data uploads

EXPOSE 8000

CMD ["sh", "-c", "python -c 'from app.database import init_db; init_db()' && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
