import logging

logger = logging.getLogger(__name__)

async def process_text_and_retrieve(text: str, role: str, jurisdiction: str) -> list[str]:
    """
    Splits text into chunks, embeds them using Sentence Transformers,
    stores in a local ChromaDB, and retrieves the top 5 relevant chunks based on a query.
    """
    if not text.strip():
        return []

    logger.info("Importing heavy ML and Langchain modules...")
    from langchain_text_splitters import RecursiveCharacterTextSplitter
    from langchain_community.embeddings import HuggingFaceEmbeddings
    from langchain_community.vectorstores import Chroma
    logger.info("Modules imported successfully.")

    # 1. Split extracted text into chunks 
    logger.info("Splitting text into chunks...")
    # Assuming ~4 characters per token, 500-800 tokens is roughly 2000-3200 characters.
    # Using 2500 characters chunk size with 250 overlap.
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=2500,
        chunk_overlap=250,
        length_function=len
    )
    chunks = text_splitter.split_text(text)

    # 2. Use sentence-transformers (all-MiniLM-L6-v2)
    logger.info("Initializing HuggingFaceEmbeddings (Sentence Transformers)...")
    embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

    # 3. Store embeddings in ChromaDB (local)
    logger.info("Vectorizing chunks and storing in ChromaDB...")
    # Using an ephemeral, in-memory Chroma database instance for the session
    vectorstore = Chroma.from_texts(
        texts=chunks,
        embedding=embeddings,
        collection_name="contract_analysis"
    )

    # 4. Create a retriever that returns top 5 relevant chunks
    logger.info("Retrieving relevant documents...")
    retriever = vectorstore.as_retriever(search_kwargs={"k": 5})

    # Create a generic query based on the given context to test the retriever
    query = f"what are the risks, liabilities, obligations, and termination conditions for a {role} in {jurisdiction}?"
    
    # Retrieve relevant documents
    relevant_documents = retriever.invoke(query)
    logger.info(f"Retrieved {len(relevant_documents)} chunks.")
    
    # Return the string content of the chunks
    return [doc.page_content for doc in relevant_documents]
