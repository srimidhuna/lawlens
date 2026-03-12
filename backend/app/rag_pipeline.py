import logging
import uuid

logger = logging.getLogger(__name__)

# In-memory store for vectorstores keyed by contract_id
_vectorstores = {}


async def build_vectorstore(text: str) -> str:
    """
    Splits text into chunks, embeds with all-MiniLM-L6-v2,
    stores in ChromaDB, and returns a unique contract_id.
    """
    if not text.strip():
        return ""

    logger.info("Importing ML and Langchain modules for vectorstore...")
    from langchain_text_splitters import RecursiveCharacterTextSplitter
    from langchain_community.embeddings import HuggingFaceEmbeddings
    from langchain_community.vectorstores import Chroma
    logger.info("Modules imported successfully.")

    # Split text into chunks
    logger.info("Splitting text into chunks...")
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=2500,
        chunk_overlap=250,
        length_function=len
    )
    chunks = text_splitter.split_text(text)
    logger.info(f"Created {len(chunks)} chunks.")

    # Embed using sentence-transformers
    logger.info("Initializing HuggingFaceEmbeddings...")
    embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

    # Store in ChromaDB with a unique collection name
    contract_id = str(uuid.uuid4())
    collection_name = f"contract_{contract_id.replace('-', '_')}"

    logger.info(f"Building vectorstore (collection: {collection_name})...")
    vectorstore = Chroma.from_texts(
        texts=chunks,
        embedding=embeddings,
        collection_name=collection_name
    )

    _vectorstores[contract_id] = vectorstore
    logger.info(f"Vectorstore built and stored with contract_id: {contract_id}")
    return contract_id


async def query_vectorstore(contract_id: str, question: str) -> list[str]:
    """
    Retrieves top 5 relevant chunks from a previously built vectorstore.
    """
    vectorstore = _vectorstores.get(contract_id)
    if not vectorstore:
        logger.warning(f"No vectorstore found for contract_id: {contract_id}")
        return []

    logger.info(f"Querying vectorstore {contract_id} with: {question[:80]}...")
    retriever = vectorstore.as_retriever(search_kwargs={"k": 5})
    relevant_docs = retriever.invoke(question)
    logger.info(f"Retrieved {len(relevant_docs)} chunks.")
    return [doc.page_content for doc in relevant_docs]
