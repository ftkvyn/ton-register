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
    uint32 public info;

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
    constructor() public checkOwner {
        info = 7; // hardcoded for now
        teacher_public_key = tvm.pubkey();
    }

    /// Setters

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

    /// Getters

    function getStudents() public view returns (uint32[] studentIds){
        optional(uint32, Mark[]) nextPair = marks_dict.min();

        while (nextPair.hasValue()) {
            (uint32 studentId, ) = nextPair.get();
            studentIds.push(studentId);
            nextPair = marks_dict.next(studentId);
        }
    }

    function getStudentMarks(uint32 studentId) public view returns (Mark[] marks){
        optional(Mark[]) student_marks = marks_dict.fetch(studentId);

        if (student_marks.hasValue()) {
            marks = student_marks.get();
        }
    }
}