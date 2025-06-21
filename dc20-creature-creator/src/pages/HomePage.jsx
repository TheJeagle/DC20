// src/pages/HomePage.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import './HomePage.css'; // Create this CSS file

const HomePage = () => {
    // In a real app, highlightedCreatures would be fetched from Firestore
    const highlightedCreatures = [
        { id: '1', name: 'Grimfang Alpha', type: 'Beast', role: 'Lurker', submittedBy: 'UserX' },
        { id: '2', name: 'Stoneheart Guardian', type: 'Construct', role: 'Defender', submittedBy: 'UserY' },
        { id: '3', name: 'Nether Lich', type: 'Undead', role: 'Caster', submittedBy: 'UserZ' },
    ];

    return (
        <div className="homepage-container">
            <section className="hero-section">
                <h1>Welcome to the DC20 Creature Hub!</h1>
                <p className="site-purpose">
                    Your ultimate destination for creating, sharing, and discovering unique creatures
                    for your DC20 tabletop roleplaying games. Unleash your imagination and
                    bring your worlds to life!
                </p>
                <Link to="/create" className="cta-button">Start Creating Now</Link>
            </section>

            <section className="highlighted-creatures-section">
                <h2>Community Highlights</h2>
                <div className="creatures-grid">
                    {highlightedCreatures.map(creature => (
                        <div key={creature.id} className="creature-card-preview">
                            <h3>{creature.name}</h3>
                            <p>{creature.type} | {creature.role}</p>
                            <p className="submitted-by">By: {creature.submittedBy}</p>
                            {/* <Link to={`/creatures/${creature.id}`} className="view-details-button">View Details</Link> */}
                        </div>
                    ))}
                </div>
            </section>
            {/* More sections can be added later */}
        </div>
    );
};

export default HomePage;