import React, { useState,useEffect } from 'react'
import axios from "axios";
import './Custom.css'
const API_URL = "http://localhost:5000/api/custom-words";
const Custom = () => {
    
    const [word,setWord]=useState("");
    const [words,setWords]=useState([]);
    const [loading, setLoading] = useState(true);
    const [adding, setAdding] = useState(false);
    const [message, setMessage] = useState("");
    useEffect(() => {
    const fetchWords = async () => {
      try {
        const token = localStorage.getItem("token");

const response = await axios.get(API_URL, {
  headers: {
    Authorization: `Bearer ${token}`,
  },
});
        setWords(response.data);
      } catch (error) {
        console.error("Error fetching words:", error);
        setMessage("Failed to load words");
      } finally {
        setLoading(false);
      }
    };

    fetchWords();
  }, []);
    const addWord= async()=>{
        const newWord=word.trim().toLowerCase();
        if(newWord===""){
            setMessage("Please enter a word");
            return;
        }
        if (words.some((item) => item.word === newWord)) {
            setMessage("This word already exists");
            return;
        }
        try {
      setAdding(true);
      setMessage("");

     const token = localStorage.getItem("token");

const response = await axios.post(
  API_URL,
  { word: newWord },
  {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }
);

      
      setWords((prev) => [response.data.word, ...prev]);

      setWord("");
      setMessage("Word added successfully");
    } catch (error) {
      if (error.response?.status === 409) {
        setMessage("This word already exists");
      } else {
        setMessage("Failed to add word");
      }
    } finally {
      setAdding(false);
    }
    }
    
const deleteWord = async (id) => {
  const token = localStorage.getItem("token");

  try {
    await axios.delete(`${API_URL}/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    setWords((prev) => prev.filter((item) => item._id !== id));
    setMessage("Word deleted successfully");
  } catch (error) {
    console.error("Error deleting word:", error);
    setMessage(
      error.response?.data?.message || "Failed to delete word"
    );
  }
};

  return (
    <div className='custom-words'>
        <div className="container">
            <h1>Custom Words</h1>
            <p className='custom-subtitle'>Add words that should be flagged by your
          Toxic Speech Detection System.</p>
          <div className="add-word-box">
            <input type="text" placeholder='Enter custom word...' value={word}
            onChange={(e)=>setWord(e.target.value)}
            onKeyDown={(e)=>{
                if (e.key==="Enter") {
                    addWord();
                }
            }}/>
              <button
            onClick={addWord}
            disabled={adding}
          >
            {adding ? "Adding..." : "+ Add Word"}
          </button>
          </div>
           {message && (
          <p className="word-message">
            {message}
          </p>
        )}
          <div className="word-list">
            <h2>Your Custom Words
                <span>{words.length}</span>
            </h2>
              {loading ? (
                <div className="empty">
                    Loading...
                </div>
                ) : words.length === 0 ? (
                <div className="empty">
                    No custom words added yet.
                </div>
               ):(
                <div className="words">
                    {words.map((item,index)=>(
                        <div className="word-item" key={item._id}>
                            <div className="word-info">
                                <span className='word-icon'>
                                    ⚠
                                </span>
                                <span>
                                    {item.word}
                                </span>
                            </div>
                            <button className='delete-button' onClick={()=>deleteWord(item._id)}>🗑</button>
                        </div>
                    ))}
                </div>
               )}
          </div>
        </div>
    </div>
  )
}

export default Custom