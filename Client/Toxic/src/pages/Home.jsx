import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom';
import './Home.css';


const Home = () => {
const navigate = useNavigate();
  return (
   <> <div className='Hero'>
    <div className="hero-layout">
      <h1>TOXIC DETECTOR</h1>
      <p className='hero-subtitle'>AI-powered detection of toxic and harmful speech</p>
      <div className="box">
        <h3>Detect Toxic Speech</h3>
        <p>Analyze comments and identify toxic, offensive,
            or hateful content using AI.</p>
        <button onClick={() => navigate('/analyze')}> 🔍 Analyze Comment</button>
      </div>
    </div>
    </div></>
  )
}

export default Home