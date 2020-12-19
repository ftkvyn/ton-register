pragma solidity >= 0.6.0;
// pragma AbiHeader pubkey;

/// @title Students marks register
/// @author ftkvyn
contract Register {

    struct Mark {
        uint8 mark;
        string message;
    }

    // uint public seq_no; there is in-build reply protection, we don't need this
    uint256 teacher_public_key; // not using tvm.pubkey() as the value may change
    uint256 principal_public_key;
    mapping(uint32 => Mark[]) marks_dict;
    string public info;

    // Function to receive plain transfers.
    receive() external {
    }

    modifier checkOwner {
        require(msg.pubkey() == tvm.pubkey(), 100);

        tvm.accept();
        _;
    }
    
    modifier teacherOrPrincipal {
        require(msg.pubkey() == teacher_public_key || msg.pubkey() == principal_public_key, 100);

        tvm.accept();
        _;
    }

    modifier teacherOnly {
        require(msg.pubkey() == teacher_public_key, 100);

        tvm.accept();
        _;
    }

    modifier principalOnly {
        require(msg.pubkey() == principal_public_key, 100);

        tvm.accept();
        _;
    }

    /// @dev Contract constructor.
    constructor(string _info) public checkOwner {
        info = _info;
        teacher_public_key = tvm.pubkey();
    }

    /// @dev Giving a new mark to a student
    function addMark(uint32 studentId, uint8 markValue, string message) public teacherOnly {
        Mark newMark = Mark(markValue, message);
        optional(Mark[]) student_marks_opt = marks_dict.fetch(studentId);
        
        require(student_marks_opt.hasValue(), 38); // student must exist;

        Mark[] student_marks_array = student_marks_opt.get();
        student_marks_array.push(newMark);

        marks_dict.replace(studentId, student_marks_array);
    }

    function addStudent(uint32 studentId) public teacherOnly {
        optional(Mark[]) student_marks_opt = marks_dict.fetch(studentId);
        
        require(!student_marks_opt.hasValue(), 41); // student must NOT exist;

        Mark[] marks_empty;

        marks_dict.add(studentId, marks_empty);
    }

    function updateTeachersKey(uint256 newKey) public teacherOrPrincipal {
        teacher_public_key = newKey;
    }

    function updatePrincipalsKey(uint256 newKey) public principalOnly {
        teacher_public_key = newKey;
    }
}